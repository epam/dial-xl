import json
import os
import subprocess

from concurrent.futures import ThreadPoolExecutor
from itertools import chain
from typing import Any, Literal, TYPE_CHECKING

import boto3
import botocore
import networkx as nx
import numpy as np

from tests.e2e.models.verdict import Verdict
from tests.e2e.excel_report import XLSXReport
from tests.e2e.models.qg_report import QGReport
from tests.e2e.utils.stats.power_analysis import (
    get_fisher_pvalue,
    get_optimal_beta,
    get_optimal_chunk_size,
    get_optimal_n2_for_non_prior_tests,
    get_ztest_pvalue,
)
from tests.e2e.utils.stats.structs import CaseStats, Conclusion, GlobalStats

if TYPE_CHECKING:
    from collections.abc import Callable

TestType = Literal["integration", "business"]
DELTA = 0.2
ALPHA = 0.2
BETA = 0.2
FRAC_FAILED = 0.33
N_MONTE_CARLO = 1000
BUCKET_NAME = "test-dial-xl-test-results"
TEST_RESULTS_PREFIX = "test-results/"
MAX_RUN_COUNT = 7


def _append_commit_graph_file_to_graph(
    graph: nx.classes.digraph.DiGraph, commit_graph_str: str
) -> nx.classes.digraph.DiGraph:
    for line in commit_graph_str.strip().split("\n"):
        line = line.strip('"')
        commit, parents, author, date, message = line.split("|", 4)
        graph.add_node(commit, author=author, date=date, message=message)
        for p in parents.split():
            graph.add_edge(commit, p)
    return graph


def _boto_s3_ls(s3_boto, bucket_name: str, prefix: str) -> tuple[list[str], list[str]]:
    response = s3_boto.list_objects_v2(Bucket=bucket_name, Prefix=prefix, Delimiter="/")
    return list(map(lambda x: x["Prefix"], response.get("CommonPrefixes", []))), list(
        map(lambda x: x["Prefix"].split("/")[1], response.get("CommonPrefixes", []))
    )


def _boto_s3_read_file(s3_boto, bucket_name: str, file_path: str) -> str:
    try:
        response = s3_boto.get_object(Bucket=bucket_name, Key=file_path)
        response_body = response["Body"].read().decode("utf-8")
        return response_body
    except botocore.exceptions.ClientError:
        return "{}"


def _load_s3_test_results(
    candidate_history_commits: list[str],
    bucket_name: str,
    test_results_prefix: str,
    test_type: TestType = "integration",
    max_workers: int = 10,
) -> tuple[list[tuple[str, str]], list[dict[str, Any]]]:
    test_suffix = test_type + "/"
    s3_boto = boto3.client("s3")

    _, existing_commits = _boto_s3_ls(s3_boto, bucket_name, test_results_prefix)
    history_commits = set(existing_commits).intersection(candidate_history_commits)
    commit_prefix_pattern = test_results_prefix + "%s/"
    commit_prefixes = list(map(lambda x: commit_prefix_pattern % x, history_commits))
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        chain_job_prefixes = list(
            executor.map(
                lambda x: _boto_s3_ls(s3_boto, bucket_name, x)[0], commit_prefixes
            )
        )
    job_prefixes = list(chain.from_iterable(chain_job_prefixes))
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        chain_report_prefixes = list(
            executor.map(
                lambda x: _boto_s3_ls(s3_boto, bucket_name, x)[0], job_prefixes
            )
        )
    report_prefixes = list(
        filter(
            lambda x: x.endswith(test_suffix),
            chain.from_iterable(chain_report_prefixes),
        )
    )
    report_paths = list(map(lambda x: x + "report.json", report_prefixes))
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        report_jsons = list(
            map(
                json.loads,
                executor.map(
                    lambda x: _boto_s3_read_file(s3_boto, bucket_name, x), report_paths
                ),
            )
        )
    commits_with_jod_id = list(
        map(lambda x: (x.split("/")[1], x.split("/")[-3]), report_paths)
    )
    return commits_with_jod_id, report_jsons


def _is_relevant_run(
    status: Verdict | Literal["skipped"], exception_name: str | None
) -> bool:
    match status:
        case Verdict.PASSED:
            return True

        case Verdict.FAILED:
            verdict_code = XLSXReport.get_verdict_code(exception_name)
            return verdict_code != "RE"

        case "skipped":
            return False

        case _:
            return False


def _make_test_results_by_commit(
    commits_with_jod_id: list[tuple[str, str]], report_jsons: list
) -> dict[str, dict[str, list[list[str]]]]:
    filtered_commits_with_jod_id, filtered_report_jsons = list(
        zip(*filter(lambda x: x[1], zip(commits_with_jod_id, report_jsons)))
    )
    compared_test_results = dict(
        zip(
            filtered_commits_with_jod_id,
            [
                {
                    test_name: [
                        tr["status"]
                        for tr in report_json["tests"][test_name]
                        if _is_relevant_run(tr["status"], tr["exception_name"])
                    ]
                    for test_name in report_json["tests"]
                }
                for report_json in filtered_report_jsons
            ],
        )
    )
    test_results_by_commit: dict[str, dict[str, list[list[str]]]] = {}
    for commit_sha, job_id in compared_test_results:
        if commit_sha not in test_results_by_commit:
            test_results_by_commit[commit_sha] = dict()
        for test_name, tr in compared_test_results[(commit_sha, job_id)].items():
            if test_name not in test_results_by_commit[commit_sha]:
                test_results_by_commit[commit_sha][test_name] = [tr]
            else:
                test_results_by_commit[commit_sha][test_name].append(tr)
    return test_results_by_commit


def _get_test_names(test_results_by_commit: dict) -> set[str]:
    return set(
        chain.from_iterable([tr.keys() for tr in test_results_by_commit.values()])
    )


def _group_by_chunk_size(
    data: list[list[float]], commits: list[str], chunk_size: float
) -> tuple[list[list[float]], list[list[str]]]:
    chunks: list[list[float]] = [[]]
    commit_chunks: list[list[str]] = [[]]
    for sublist, commit in zip(data, commits):
        if len(chunks[-1]) >= chunk_size:
            chunks.append([])
            commit_chunks.append([])
        chunks[-1].extend(sublist)
        commit_chunks[-1].append(commit)
    if len(chunks[-1]) < chunk_size and len(chunks) > 1:
        chunks.pop()
        commit_chunks.pop()
    return chunks, commit_chunks


def _build_history_from_chunks(
    chunked_test_case_results: list[list[float]],
    commit_chunks: list[list[str]],
    alpha: float,
    max_history_size: int = 250,
) -> tuple[list[float], list[str]]:
    history = chunked_test_case_results[0]
    used_commits = []
    for i in range(len(chunked_test_case_results)):
        if len(history) >= max_history_size:
            break
        pvalue = get_ztest_pvalue(history, chunked_test_case_results[i])
        if pvalue >= alpha:
            history.extend(chunked_test_case_results[i])
            used_commits.extend(commit_chunks[i])
        else:
            break
    return history, used_commits


def _build_test_case_history(
    test_case_str_results: list[list[str]],
    commits: list[str],
    chunk_alpha: float = 0.33,
    chunk_beta: float = 0.1,
    chunk_delta: float = 0.125,
) -> tuple[list[float], list[str]]:
    test_case_results = list(
        map(
            lambda str_results: [float(t == "passed") for t in str_results],
            test_case_str_results,
        )
    )
    if sum(map(len, test_case_results)):
        p_est = sum(map(sum, test_case_results)) / sum(map(len, test_case_results))
    else:
        p_est = 0.5
    chunk_size = get_optimal_chunk_size(p_est, chunk_alpha, chunk_beta, chunk_delta)
    chunked_test_case_results, commit_chunks = _group_by_chunk_size(
        test_case_results, commits, chunk_size
    )
    return _build_history_from_chunks(
        chunked_test_case_results, commit_chunks, chunk_alpha
    )


def _get_history(
    test_results_by_commit: dict[str, dict[str, list[list[str]]]],
    test_names: set[str],
    candidate_history_commits: list[str],
) -> tuple[dict[str, list[float]], set[str]]:
    history = dict()
    all_used_commits = set()
    for test_case_name in test_names:
        test_case_str_results = [
            list(chain.from_iterable(test_results_by_commit[commit][test_case_name]))
            for commit in candidate_history_commits
            if commit in test_results_by_commit
            and test_case_name in test_results_by_commit[commit]
        ]
        commits = [
            commit
            for commit in candidate_history_commits
            if commit in test_results_by_commit
            and test_case_name in test_results_by_commit[commit]
        ]
        test_case_history, used_commits = _build_test_case_history(
            test_case_str_results, commits
        )
        if test_case_history:
            history[test_case_name] = test_case_history
            all_used_commits.update(used_commits)
    return history, all_used_commits


def _get_optimal_n2_for_history(
    history: dict[str, list[float]],
    n_range: range,
    fraction_failed: float = FRAC_FAILED,
    alpha: float = ALPHA,
    beta: float = BETA,
    delta: float = DELTA,
    n_mc: int = N_MONTE_CARLO,
) -> float:
    n2 = get_optimal_n2_for_non_prior_tests(
        list(history.values()),
        int(len(history) * fraction_failed),
        n_range,
        alpha=alpha,
        beta=beta,
        delta=delta,
        n_mc=n_mc,
    )
    if np.isnan(n2):
        n2 = list(n_range)[-1]
    return n2


def _get_graphql_merge_requests(n_pages=20, page_size=100):
    access_token = os.getenv("PROJECT_ACCESS_TOKEN", "")
    curl_results_merge_requests = subprocess.run(
        [
            "curl",
            "--request",
            "POST",
            "--url",
            "https://gitlab.deltixhub.com/api/graphql",
            "--header",
            f"PRIVATE-TOKEN: {access_token}",
            "--header",
            "Content-Type: application/json",
            "--data",
            '{ "query": "query($fullPath: ID!) { project(fullPath: $fullPath) { mergeRequests(state: merged, first: %d) { nodes { id , state , targetBranch , sourceBranch , mergeCommitSha , diffRefs { baseSha , headSha , startSha } , commits { nodes { id , sha, } } } , pageInfo { hasNextPage , endCursor } } } }", "variables": {"fullPath": "Deltix/quantgrid"} }'
            % (page_size,),
        ],
        stdout=subprocess.PIPE,
        text=True,
    )
    merge_requests_json = json.loads(curl_results_merge_requests.stdout)
    all_nodes = merge_requests_json["data"]["project"]["mergeRequests"]["nodes"]
    if not merge_requests_json["data"]["project"]["mergeRequests"]["pageInfo"][
        "hasNextPage"
    ]:
        return all_nodes
    cursor = merge_requests_json["data"]["project"]["mergeRequests"]["pageInfo"][
        "endCursor"
    ]
    for i in range(1, n_pages):
        curl_results_merge_requests = subprocess.run(
            [
                "curl",
                "--request",
                "POST",
                "--url",
                "https://gitlab.deltixhub.com/api/graphql",
                "--header",
                f"PRIVATE-TOKEN: {access_token}",
                "--header",
                "Content-Type: application/json",
                "--data",
                '{ "query": "query($fullPath: ID! , $after: String) { project(fullPath: $fullPath) { mergeRequests(state: merged, first: %d, after: $after ) { nodes { id , state , targetBranch , sourceBranch , mergeCommitSha , diffRefs { baseSha , headSha , startSha } , commits { nodes { id , sha, } } } , pageInfo { hasNextPage , endCursor } } } }", "variables": {"fullPath": "Deltix/quantgrid", "after": "%s"} }'
                % (page_size, cursor),
            ],
            stdout=subprocess.PIPE,
            text=True,
        )
        merge_requests_json = json.loads(curl_results_merge_requests.stdout)
        nodes = merge_requests_json["data"]["project"]["mergeRequests"]["nodes"]
        all_nodes += nodes
        if merge_requests_json["data"]["project"]["mergeRequests"]["pageInfo"][
            "hasNextPage"
        ]:
            cursor = merge_requests_json["data"]["project"]["mergeRequests"][
                "pageInfo"
            ]["endCursor"]
        else:
            break
    return all_nodes


def _get_first_list_idx_in_set(commits: list[str], commit_set: set[str]) -> int:
    for i, link in enumerate(commits):
        if link in commit_set:
            return i
    return len(commits) - 1


def _get_candidate_history_commits() -> list[str]:
    merged_nodes = _get_graphql_merge_requests()
    main_source_parents = set(
        [
            merged_node["diffRefs"]["baseSha"]
            for merged_node in merged_nodes
            if merged_node["targetBranch"] == "main"
        ]
    )

    current_commit_graph = subprocess.run(
        [
            "git",
            "log",
            '--pretty=format:"%H|%P|%an|%ad|%s"',
            "--date=iso",
            "--all",
        ],
        stdout=subprocess.PIPE,
        text=True,
    ).stdout
    main_branch_graph: nx.DiGraph = nx.DiGraph()

    _append_commit_graph_file_to_graph(
        graph=main_branch_graph, commit_graph_str=current_commit_graph
    )

    main_head_node = subprocess.run(
        [
            "git",
            "rev-parse",
            "origin/main",
        ],
        stdout=subprocess.PIPE,
        text=True,
    ).stdout.strip()

    current_branch_head_node = subprocess.run(
        [
            "git",
            "rev-parse",
            "HEAD",
        ],
        stdout=subprocess.PIPE,
        text=True,
    ).stdout.strip()
    if main_head_node == current_branch_head_node:
        successors = list(main_branch_graph.successors(main_head_node))
        if len(successors) == 1:
            main_head_node = successors[0]
        elif len(successors) == 2:
            if successors[0] in main_source_parents:
                main_head_node = successors[0]
            elif successors[1] in main_source_parents:
                main_head_node = successors[1]

    main_commit_chain = [main_head_node]
    while True:
        successors = list(main_branch_graph.successors(main_commit_chain[-1]))
        if len(successors) == 1:
            main_commit_chain.append(successors[0])
        elif len(successors) == 2:
            if successors[0] in main_source_parents:
                main_commit_chain.append(successors[0])
            elif successors[1] in main_source_parents:
                main_commit_chain.append(successors[1])
            else:
                break
        else:
            break
    current_head_descendants = nx.descendants(
        main_branch_graph, current_branch_head_node
    )
    first_main_descendant_idx = _get_first_list_idx_in_set(
        main_commit_chain, current_head_descendants
    )
    candidate_history_commits = main_commit_chain[first_main_descendant_idx:]
    return candidate_history_commits


def _build_latest_history_and_excluded_history(
    candidate_history_commits: list[str],
    test_results_by_commit: dict[str, dict[str, list[list[str]]]],
    test_names: set[str],
) -> tuple[dict[str, list[float]], dict[str, list[float]], set[str]]:
    first_fork_main_commit_id = _get_first_list_idx_in_set(
        candidate_history_commits, set(test_results_by_commit.keys())
    )
    first_fork_main_commit = candidate_history_commits[first_fork_main_commit_id]
    first_fork_main_commit_results, _ = _get_history(
        {first_fork_main_commit: test_results_by_commit[first_fork_main_commit]},
        test_names,
        [first_fork_main_commit],
    )
    history_except_first_fork_main_commit, history_commits = _get_history(
        {
            key: value
            for key, value in test_results_by_commit.items()
            if key != first_fork_main_commit
        },
        test_names,
        candidate_history_commits[first_fork_main_commit_id + 1 :],
    )
    history_commits.add(first_fork_main_commit)
    return (
        first_fork_main_commit_results,
        history_except_first_fork_main_commit,
        history_commits,
    )


def _get_latest_history_vs_excluded_history_stats(
    history_commits: set[str],
    prior_commit_results: dict[str, list[float]],
    history: dict[str, list[float]],
) -> tuple[GlobalStats, dict[str, CaseStats]]:
    return _get_stats_with_fisher_pvalue(
        history,
        prior_commit_results,
        history_commits,
    )


def build_history_and_estimate_sample_size(
    test_type: TestType = "integration",
    fraction_failed: float = FRAC_FAILED,
    bucket_name: str = BUCKET_NAME,
    test_results_prefix: str = TEST_RESULTS_PREFIX,
    alpha: float = ALPHA,
    beta: float = BETA,
    delta: float = DELTA,
    n_mc: int = N_MONTE_CARLO,
) -> tuple[
    dict[str, list[float]],
    float,
    set[str],
    tuple[GlobalStats, dict[str, CaseStats]],
]:
    candidate_history_commits = _get_candidate_history_commits()
    commits_with_jod_id, report_jsons = _load_s3_test_results(
        candidate_history_commits, bucket_name, test_results_prefix, test_type
    )
    test_results_by_commit = _make_test_results_by_commit(
        commits_with_jod_id=commits_with_jod_id,
        report_jsons=report_jsons,
    )
    test_names = _get_test_names(test_results_by_commit)
    prior_commit_results, history, history_commits = (
        _build_latest_history_and_excluded_history(
            candidate_history_commits=candidate_history_commits,
            test_results_by_commit=test_results_by_commit,
            test_names=test_names,
        )
    )
    n2 = _get_optimal_n2_for_history(
        history=history,
        n_range=range(1, MAX_RUN_COUNT + 1, 1),
        fraction_failed=fraction_failed,
        alpha=alpha,
        beta=beta,
        delta=delta,
        n_mc=n_mc,
    )
    prior_global_stats, prior_stats_by_case = (
        _get_latest_history_vs_excluded_history_stats(
            history_commits=history_commits,
            prior_commit_results=prior_commit_results,
            history=history,
        )
    )
    return (
        history,
        n2,
        history_commits,
        (prior_global_stats, prior_stats_by_case),
    )


def _cast_reports_to_results(
    current_report: dict[str, list[QGReport]],
) -> dict[str, list[float]]:
    return {
        tn: [
            float(qg.status == Verdict.PASSED)
            for qg in list_qg
            if _is_relevant_run(qg.status, qg.exception_name)
        ]
        for tn, list_qg in current_report.items()
    }


def get_stats_with_fisher_pvalue_for_report(
    history: dict[str, list[float]],
    current_report: dict[str, list[QGReport]],
    history_commits: set[str],
    alpha: float = ALPHA,
    beta: float = BETA,
    delta: float = DELTA,
    fraction_failed: float = FRAC_FAILED,
) -> tuple[GlobalStats, dict[str, CaseStats]]:
    results = _cast_reports_to_results(current_report)
    return _get_stats_with_fisher_pvalue(
        history=history,
        results=results,
        history_commits=history_commits,
        alpha=alpha,
        beta=beta,
        delta=delta,
        fraction_failed=fraction_failed,
    )


def _get_stats_with_fisher_pvalue(
    history: dict[str, list[float]],
    results: dict[str, list[float]],
    history_commits: set[str],
    alpha: float = ALPHA,
    beta: float = BETA,
    delta: float = DELTA,
    fraction_failed: float = FRAC_FAILED,
) -> tuple[GlobalStats, dict[str, CaseStats]]:
    nonempty_history_test_names = set(
        filter(
            lambda x: history[x],
            history.keys(),
        )
    )
    test_names = list(set(results.keys()).intersection(nonempty_history_test_names))
    combined_pvalue, pvalues = get_fisher_pvalue(
        [history[tn] for tn in test_names], [results[tn] for tn in test_names]
    )
    pack_test_stats: Callable[[Any], tuple[str, CaseStats]] = lambda x: (
        x[0],
        CaseStats(
            name=x[0],
            history_probability=x[1],
            probability=x[2],
            pvalue=x[3],
            history_size=x[4],
            size=x[5],
            conclusion=(
                Conclusion.STABLE
                if x[3] > alpha
                else (
                    Conclusion.POSITIVE_SHIFT
                    if x[2] > x[1]
                    else Conclusion.NEGATIVE_SHIFT
                )
            ),
            beta=float(get_optimal_beta(x[1], x[4], x[5], alpha, delta)),
        ),
    )
    stats_by_case = dict(
        map(
            pack_test_stats,
            zip(
                test_names,
                [np.mean(history[tn]) for tn in test_names],
                [np.mean(results[tn]) for tn in test_names],
                pvalues,
                [float(len(history[tn])) for tn in test_names],
                [float(len(results[tn])) for tn in test_names],
            ),
        )
    )
    conclusions = np.asarray([stats_by_case[tn].conclusion for tn in stats_by_case])
    return (
        GlobalStats(
            fisher_pvalue=combined_pvalue,
            history_commits=list(history_commits),
            n_higher=float(np.sum(conclusions == Conclusion.POSITIVE_SHIFT)),
            n_lower=float(np.sum(conclusions == Conclusion.NEGATIVE_SHIFT)),
            n_same=float(np.sum(conclusions == Conclusion.STABLE)),
            alpha=alpha,
            beta=beta,
            delta=delta,
            fraction_failed=fraction_failed,
        ),
        stats_by_case,
    )
