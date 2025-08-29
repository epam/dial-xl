# Evaluation

## Intro

Users should be able to configure a set of test questions and for each question specify a set of fields' values 
that must be founded by embedding index for the bot to correctly answer questions.

Based on this data, the optimal `n` and `model` for each field should be selected. We should maximize the following metrics:
- Number of passed questions: the question is considered answered if all specified values were found.
- Recall

## Evaluation table

Example:
```
!evaluation()
!manual()
table Evaluation
    [Passed] = [Avg Recall] = 1
    [Avg Recall] = AVERAGE(
        RECALL(
            RETRIEVE(
                Ingredients[item],
                Evaluation[Question],
                Evaluation.EVALUATE_N(Ingredients[item]),
                Evaluation.EVALUATE_MODEL(Ingredients[item])                
            ),
            Evaluation[Ground truth for items]
        ),
        RECALL(
            RETRIEVE(
                Ingredients[price_type],
                Evaluation[Question],
                Evaluation.EVALUATE_N("Ingredients[price_type]"),
                Evaluation.EVALUATE_MODEL(Ingredients[price_type])                
            ),
            Evaluation[Ground truth for types]
        )
    )
    !evaluation_question()
    [Question] = NA
    !evaluation_field("Ingredients[item]")
    [Ground truth for items]
    !evaluation_field("Ingredients'[price_type']")
    [Ground truth for types]
override
[Question],[Ground truth for items],[Ground truth for types]
"What cheap vegetables do I have?","Carrots;Potatoes;Onions;Garlic","Cheap"

table EvaluationResult
    [Number of passed] = Evaluation[Passed].FILTER($ = 1).COUNT()
    [Avg recall] = Evaluation[Avg Recall].AVERAGE()
```

`;` is a temporary separator for values and can be escaped by `';`, must be changed to array of values after 
support them in the override section.

## New graph nodes

### Evaluation

Description: chooses optimal `n` and `model` for every field from input.

Input:
- `source` is plan
- `Question` string field
- `Ground truth` string field
- `Field` is plan

Output for every evaluated field:
- `Field Name` string field. Example: `Ingredients[item]`.
- `N` integer field
- `Model` string field

### Recall

Description: calculates the recall metric for a field, `recall = |founded from ground truth| / |ground truth|`.

Input:
- `source` is plan
- `Question` string field
- `Ground truth` string field
- `Field` string field. Example: `Ingredients[item]`.

Output: 
- `Recall` double field

### Tokenize

Description: tokenize strings with openai tokenizer. Library: https://github.com/knuddelsgmbh/jtokkit

Input:
- string field (N)

Output:
- `tokens` double field. (N)

### MRR
1 0.5 0.(3) 0.25
Description: calculates the mrr metric for a field, `mrr = AVERAGE(SUM(1 / rank_i))`, when `rank_i` 
is position of ground truth's item in the data.

Input:
- `source` is plan
- `Question` string field
- `Ground truth` string field
- `Field` string field. Example: `Ingredients[item]`.

Output:
- `MRR` double field

## New functions

### RECALL

Params:
- Data: string column
- Question: string
- Ground truth: string with `;` delimiter. Delimiter in the data can be escaped by `';`.
- N: OPTIONAL, integer, default: number of elements in the ground truth.
- Model name: OPTIONAL, string, default: the default system model.

Return value: double

Example: `RECALL(Data[Countries], "Neighbors of Belarus", "Ukraine;Russia;Poland;Litva;Lithuania", 20, "bge-small-en-v1.5")`

### EVALUATE_N

Params:
- Evaluation: a special table with `!evaluation()` decorator.
- Field: target field

Return value: integer

Example: `Evaluation.EVALUATE_N(table[field])`

### EVALUATE_MODEL

Params:
- Evaluation: a special table with `!evaluation()` decorator.
- Field: target field

Return value: string

Example: `Evaluation.EVALUATE_MODEL(table[field])`

Open questions:
- Should field be string in EVALUATE_N/EVALUATE_MODEL?
- Recall alternative:
```
    RECALL(
        RETRIEVE(
            Ingredients[item],
            Evaluation[Question],
            Evaluation.EVALUATE_N(Ingredients[item]),
            Evaluation.EVALUATE_MODEL(Ingredients[item])                
        ),
        Evaluation[Ground truth for items]
    )
->
    RETRIEVE(
        Ingredients[item],
        Evaluation[Question],
        Evaluation.EVALUATE_N(Ingredients[item]),
        Evaluation.EVALUATE_MODEL(Ingredients[item])                
    ).INTERSECTION(Evaluation[Ground truth for items]).COUNT() / Evaluation[Ground truth for items].COUNT()
```


Feedback from AV:
1. What table is used for optimization (meaning what values we are analyzing to optimize parameters)? Evaluation? EvaluationResult? Or both?
2. When searching for values to analyze, are we doing it by field names?
3. RECALL is widely used measure which how-many-found / how-many-we-suppose-to-find. And I would prefer to keep it this way. I see no harm from splitting it into two functions:
RECALL(
    RETIVE([data], [question], [N], [Model]),
    [Ground Truth])
Quite opposite, I see hard for not doing it. What if I want to see what exact keys were not found?

4. N and Model seems to be per field, not global, while call EVALUATE_N(Evaluation) suggests the opposite.
