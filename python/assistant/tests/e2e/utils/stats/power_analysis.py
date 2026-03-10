from typing import Callable

import numpy as np

from scipy.optimize import minimize
from scipy.stats import bernoulli, combine_pvalues, norm
from statsmodels.stats.proportion import proportions_ztest  # type: ignore

MINIMIZE_OPTIONS = {"gtol": 1e-10, "eps": 1e-10, "maxiter": 10000}


def get_ztest_pvalue(
    vals1: np.ndarray | list[float], vals2: np.ndarray | list[float]
) -> float:
    s1, s2 = np.sum(vals1), np.sum(vals2)
    l1, l2 = len(vals1), len(vals2)
    if (s1 == l1 and s2 == l2) or (s1 == 0 and s2 == 0):
        return 1.0
    return proportions_ztest((s1, s2), (l1, l2))[1]


def _get_ztest_result(
    vals1: np.ndarray | list[float], vals2: np.ndarray | list[float], alpha: float
) -> bool:
    return get_ztest_pvalue(vals1, vals2) > alpha


def _function_to_solve(
    p1: float, n1: float, n2: float, alpha: float, beta: float, delta: float
) -> float:
    p1 = np.clip(p1, 0.001, 0.999)
    p2 = (
        p1 - delta
        if np.abs((p1 - delta) - 0.5) < np.abs((p1 + delta) - 0.5)
        else p1 + delta
    )
    if np.abs(n1) < 1e-10 or np.abs(n2) < 1e-10:
        return np.nan
    return (
        norm.ppf(1 - alpha / 2) * np.sqrt(p1 * (1 - p1) * (1.0 / n1 + 1.0 / n2))
        + norm.ppf(1 - beta) * np.sqrt(p1 * (1 - p1) / n1 + p2 * (1 - p2) / n2)
        - delta
    )


def get_optimal_n2(
    p1: float, n1: float, alpha: float, beta: float, delta: float
) -> float:
    function_to_minimize: Callable[[float], float] = (
        lambda x: _function_to_solve(p1, n1, x, alpha, beta, delta) ** 2
    )
    return minimize(function_to_minimize, 5.0, tol=1e-10, options=MINIMIZE_OPTIONS, bounds=((2, 100),)).x[0]  # type: ignore


def get_optimal_beta(
    p1: float, n1: float, n2: float, alpha: float, delta: float
) -> float:
    function_to_minimize: Callable[[float], float] = (
        lambda x: _function_to_solve(p1, n1, n2, alpha, x, delta) ** 2
    )
    return minimize(function_to_minimize, 0.5, tol=1e-10, options=MINIMIZE_OPTIONS, bounds=((0.001, 0.999),)).x[0]  # type: ignore


def get_optimal_chunk_size(p1: float, alpha: float, beta: float, delta: float) -> float:
    function_to_minimize: Callable[[float], float] = (
        lambda x: _function_to_solve(p1, x, x, alpha, beta, delta) ** 2
    )
    return minimize(function_to_minimize, 5.0, tol=1e-10, options=MINIMIZE_OPTIONS, bounds=((2, 250),)).x[0]  # type: ignore


def _get_optimal_n2_for_history(
    reference: list[float], alpha: float, beta: float, delta: float
) -> float:
    return get_optimal_n2(float(np.mean(reference)), len(reference), alpha, beta, delta)


def get_fisher_pvalue(
    list_vals1: list[list[float]], list_vals2: list[list[float]]
) -> tuple[float, list[float]]:
    ztest_pvalues: list[float] = []
    for vals1, vals2 in zip(list_vals1, list_vals2):
        pvalue = get_ztest_pvalue(vals1, vals2)
        ztest_pvalues.append(pvalue)
    combined_pvalue = float(combine_pvalues(ztest_pvalues).pvalue)
    assert type(combined_pvalue) is float
    return combined_pvalue, ztest_pvalues


def _get_fisher_result(
    list_vals1: list[list[float]], list_vals2: list[list[float]], alpha: float
) -> bool:
    return get_fisher_pvalue(list_vals1, list_vals2)[0] > alpha


def get_optimal_n2_for_non_prior_tests(
    list_of_references: list[list[float]],
    n_shifted: int,
    n_range: range,
    alpha: float,
    beta: float,
    delta: float,
    n_mc: int = 1000,
) -> float:
    optims_n2 = []
    for i in range(len(list_of_references)):
        optims_n2.append(
            get_optimal_n2(
                float(np.mean(list_of_references[i])),
                len(list_of_references[i]),
                alpha,
                beta,
                delta,
            )
        )
    hard_tests = np.argsort(optims_n2)[-n_shifted:]
    mc_list_generated_incoming = []
    for i in range(len(list_of_references)):
        p1 = np.mean(list_of_references[i])
        if i in hard_tests:
            p2 = (
                p1 - delta
                if np.abs((p1 - delta) - 0.5) < np.abs((p1 + delta) - 0.5)
                else p1 + delta
            )
            incoming = bernoulli(p=p2).rvs((list(n_range)[-1], n_mc))
        else:
            incoming = bernoulli(p=p1).rvs((list(n_range)[-1], n_mc))
        mc_list_generated_incoming.append(incoming)
    pvalues: list[list[float]] = []
    for n in n_range:
        pvalues.append([])
        for cur_N in range(n_mc):
            list_of_incoming = []
            for i in range(len(list_of_references)):
                list_of_incoming.append(
                    mc_list_generated_incoming[i][:n, cur_N].tolist()
                )
            pvalues[-1].append(
                get_fisher_pvalue(list_of_references, list_of_incoming)[0]
            )
    pvalues_arrays = np.asarray(pvalues)
    pvalues_arrays[np.isnan(pvalues_arrays)] = 1.0
    n2_comply_beta = (pvalues_arrays > alpha).mean(1) < beta
    if np.any(n2_comply_beta):
        n2 = np.asarray(list(n_range))[np.argmax(n2_comply_beta)]
    else:
        n2 = np.nan
    return n2
