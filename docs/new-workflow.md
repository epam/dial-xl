## Glossary 
1. P - power user. May have extended amount of time to work with a system and get somewhat proficient. Used to work with data, but not programmer. He may not even be full fledged data analyst: lack of python knowledge, used to BI/BA or MS Excel.
2. B - business user. May be extremely capable in his business field, but don't have time or desire to deal with data tubes. He needs a self-service system that will answer his questions and does it fast and accurate. 
3. D - demo host. Either sales person for the platform or ambasador of the platform inside organizations. He shows demos and educate others about what system is capable of. 
4. User - when we say "user" without clarrification we expect that any user expect and should be capable of using this functionality.
5. Data product - derivative table of clean data, built by some project. Usually has date/version, so one can distingusih between releases. It is was verified by experts and published for others to use. 

## Working with a projects

### Use cases
- P creates project by series of AI chat requests and want to immediately see where these changes are and whether results are correct.
- If request led to incorrect project change, user wants complete rollback in one keystroke.
- User may ask AI for explanations or request help with the platform. 
- Accepted explanation expected to be saved and potentially used for answering new questions.
- User may have few thought chains, and don't want to mix contexts.
- While project might be created in a semi-conscious vibe-coding, user wants application to remind him what table does what, where are the things he is looking for. Similarly to how new user studies project created by other. 
- While project was created in a semi-conscious vibe-coding, user don't expect project to accumulate junk, and don't expect junk to compromise AI performance.
- If user has repeated the same (semantically) question again (or question that matches explanation of a different table), he is expected AI to point him towards previously generated results instead of doing any changes to the project. 
- Additionally, user expects system to be responsible for keeping track if previous results are still valid. 
- Some power user wants to be able to use both AI and manual actions for answering certain questions. And sometime use manual actions to correct AI. AI is expected to remember corrected response.
- One user wants to deterministically show others workflow of using application, both AI and manual. For this purpose, he wants to start from a saved project state (or empty state) and play back recorded actions.
- One user may create such demo scenario and share with others so they can study it themselves, and start using it.
- AI helps teams of P (collaborating in real time) or individual P to work and experiment in the tool. From scratch or based on established project. In order to prepare project for B.
- Once Ps are comfortable with results they can publish/share their results with B
- Application expected to have all necessary tools, tweaks and adjustments that P can do to evaluate and then improve quality of the answers.
- B can observe the project given to him as an "interactive dashboard"". See charts and executive reports
- Provided dashboard is NOT read only black-box. B can ask AI their own questions, track where data came from, compute additional columns, join with their own data. All while working in private space, without affecting other B people.
- P can observe AI questions asked by Bs, see what queries where successful and what are not, and improve the project based on organically collected "feedback".  And update the data!
- B can get updated data/dashboards while their own local changes will be put on top (merged into)."
- B often need to have charts/tables that depend on numerical or categorical parameters.
- B must be able to change parameters conviniently (time-pickers, drop-downs, number) and not affect consistency of the project (only change the parts of the dashboard that expected to change, but not break the project logic)
- AI bot must be able to create such parameterized dashboards. Adjust parameters so dashboard answers B's next questions. And memorize parametrized tables as correct response to a certain queries.
- D wants to have a tools to edit project history: squash / edit / delete entries, to build a good story to present to other users.

### Requirments
1. User tends to do the least complicated thing. We should make doing right thing easy, and breaking project complicated.
2. Both missing and redundant data can be equally harmful. We should discourage both.
3. We should achive the goals above without making parts of project immutable. As updaing data, changing source cols format might be the key to get desired change.
4. We should avoid trying to reason whether change (like additional table) should be used (for AI context) or not. If it was possible AI could do by itself (seeing full context)
5. We better find solution that doesn't rely on good RNG. As every solution that relies on good RNG is added to multiplication. To get successful generation you need to hit favorable outcome in each such solution.

## Working with input data

### Use cases
- User may upload files and use them in a project. And later when project is already established and shared with  others, user may upload updated data. Project logic expected to work with updated data.
- P may want to connect external data source (SQL, snowflake, databricks and others) to his project and work on fully consistent snapshot of imported data (and avoid any sudden unexpected changes or inconsistencies). At some point user must be able to receive updated data from the data source.
- User may want to connect data from another project and work on snapshot of this data. And when external project got update, user must be able to import updated data.
- User that authors project that produces such data wants to only release verified data products. Intermediate states must not be available for imports.
- User that uses files/external sources/data products - can revert to the previous state. Data expected to work.
- User that want to know if there are updates for his imports
- Project with imported data (files, data products or external data) can be forked/clonned like any other.
- One may update and run project in headless scenario. Using API. Including import and import update.
- Automatic system upload new data every day/hour, want to run recalculation and get new output from a project. We are expected to occupy reasonable amount of storage and other respurces.


### Requirments
- "Peace of mind" about credentials to external systems. That means we should be able to explain how creds are safe, without creating too much of a inconvinience for the end users. Creds couldn't be in DSL.
- User that use data product, may not have access to the project that created this data product. And especially its data sources.
- Regardless of implementation path, we cannot make users to keep track and manage of existing snapshots, files or data-bases. 
- We cannot expect user to participate in storage/computation efficiency problems. 
- Going forward data products/external data can be Big Data (terrabyte-petabytes scale), operations like data product import or project fork expected to perofrm fast.

## New bot

### Features and expected fixes
1. "Lazy" bot problem: bot refuse to answer question, because solution cannot be generated in one shot. 
2. Sometimes router misinterpret user question as "Generic". 
3. Bot should be able to give user advices about how to use XL application itself.
4. Support of multi-assignments and other new DSL features (already done in old bot).
5. Support complex DSL features such as:
    - Charts
    - Pivots and Unpivots
    - Multiple dimensions
6. Use should be able to load document directly into bot. And may expect:
    - Bot being able to parse tables/charts/data from it
    - Use it as metadata for the questions
7. Bot should be able to clarify the qusetion with user
8. Should be able to reuse previously generated tables for new generations
9. Should be able to navigate user to existing tables/charts that answer user question without generating new actions. That it includes utilization of curated (by project author) question-answer pairs. Collected from:
    - Questions-answers used on project creation
    - Bs iteractions with a project
    - Manualy created by project author
10. Similarly bot should be able to turn user iteractions (both positive and negative) into quality tests.
11. Should be able to work in headless mode.
12. Should be able to user provided tools.

## Design 

### Key adjustments
- Removal of Apply suggestion. Now every change applied automatically. Playback included. 
- Now we have 4 different workflows:
    - `Standard`. Unlimitted project modification
    - `Readonly mode`. Only chant is abavilable for modification. Special banner says: "Clone project to modify it".
    - `Decision mode`. After user asked question in a chat he needs: Accept, Discard, Edit&Accept the changes. Banner allows to do it (Accept, Discard, Locked-enable-full-changes).
    - `Preview mode`. You see snapshot of the changes from the chat history. Banner only allows you to **close** this mode or **clone** this state where you was before.
- New hints. Instead of showing matched hint result, we navigate to tables associated with hint, highlight the focus (but still allow user to accept or reject it)
- New entity: collected "Questions", allow project owner to analyze project usage. Can be matched with hint or not matched. Accepted by user or not
- New buttons (Presumably chat buttons, but some might be in banner)
    - `Focus button` - allows navigate to previously applied to project.
    - `View button` - allows to load state snapshot.
    - `Edit summary`- allows user to change summary manually.
    - `Regenerate summary` - user changed the code manually and wants bot to write a summary. (Experts only)

### Standard workflow for P with read-write access. 

1. P asks a question in the chat. 
2. Bot replies with standard generation + summary. And adds `View button` and `Focus button` in response. `View button` need to be bright and clearly visible (as now it's part of main flow)
3. UI automatically updates results of bot generation.
4. Changes made by bot is shown in standard color schema, focused column are highlighted, the rest of the columns are greyed out.
5. Greyed content is not available for modification. Code editor is not available for modification.
6. Chat's submit button is disabled.
7. UI shows P a banner: Accept | Discard and Greyed Lock icon (expert option we need to discourage user from using it)
    - P can immediately press accept button. -> This stores new state of the project. We also store QuestionID (responseId) in the project document. 
    - P can manually adjust formulas for newly changed tables/columns (those that have standard colors) and then accept. -> This stores new state of the project, **stores changed code in bot's chat message**. We also store QuestionId 
    - P can long press lock icon and unlock free project changing. He can change project in arbitrary way and then accept. -> This stores new state of the project, QuestionID, stores changed code in bot's chat message.
    - At any time P may press discard. -> That rollback project to its original state (prior to using the bot). Removes last pair of user & bot messages. And puts user message back into message enter edit box. The previous message or message(s) need to be put into context, in order to connect those attempts for further analysis.
8. In case P adjust code, we need natural lanauge summary to match the changes. To ensure P does it, we can disable accept button (and add corresponding tooltip). And add two buttons in chat message itself (or banner):
    - Summary regeneration. That makes bot redo only summary phase. (Presumably we do it by setting specific hidden parameters, removing bot response from the chat history, and submitting another message to bot)
    - Manual edit. Allows user to manually change summary. (Presumably we make chat to allow such changes)
9. Once P changes summary automatically or manually, we enable accept button. P may try regenerate result few times and edit them manually before accepting the results
10. Once P made his decision the entire project is back to changeable state. And submit button in chat is available again.
11. Any consequent question to bot will get changed project state (if accept button was pressed), as we applied the changes permanently.
12. If P tries to close tab (or project) we are trying to force P to make a decision, using "tab contains unchanged data".
13. If P managed to quit without making his choice. We should lose unsaved changes.
14. If another P managed to make his own change while 1st P was deciding about bot change: once 1st P press accept we apply standard conflict resolution (same as if user save changes via editor to already changed project).
15. Later, P can press `Focus button` and he will be navigated to changes applied by this interaction with bot. Focused column must be highlighted (by selecting the cells). We can identify that change was previously applied by finding its QuestionID (responseId) inside the project file (See match algo below). If change wasn't applied to the project, button should not appear. Pressing this button doesn't change mode user is in.
16. Another option is pressing `View button` this button should be on every message which has state snapshot in it. By pressing this putton user opens snapshot state in a special `View mdode`. Everything is readonly. Changed columns have normal colors, rest are greyed out. Focused columns are hightlighted. 
17. At any time P is allowed to press regeenrate button in a chat.

### Read-only workflow for B

1. B that only has read-only access to project, or P that has full access but intentionally switched to read-only mode, asks bot a question. (For simplicity below we refer to user as B).
2. Next part of the flow identical to read-write: user asks question, automatically sees results and banner with accept/discard/unlock. Submit button disable. Ability to change result (boxed, and free form). 
3. If B accepts changes we store **it in chat only**. B sees the changed state of the `Preview mode`.
4. Once decision is made, B can:
    - Ask another question and get into `Decision mode` again
    - Close `Preview mode` and get back into `Readonly mode`
    - Clone the project from the preview state. And get in `Standard mode` of a clonned project.
    - `View button` message from a chat history. Remain in `Preview mode` but with a different mode
5. Any consequent question to bot will start from **original project state** (does not include any bot generation). Meaning the front-end will set perisisted project state in the system message.
6. Whenever B wants he can press `View button`. That will: get him into `Preview mode` with the state of this message. 
7. If change from chat message was applied to the project before (author's change in shared chat), message may also have `Focus botton` which should work the same way as in read-write mode.

#### Playback:
1. In playback we use standard DIAL playback: repetitive two step process: user message, bot message
2. Whenever we load bot message we auto show changes in `Preview mode`.

### Questions and hints

Question schema:
```
enum QuestionStatus {
    UNDECIDED = 0;
    ACCEPTED = 1;
    DISCARDED = 2;
}
message Question {
    # UUID
    string id = 0;
    sint64 timestamp = 1;
    string username = 2;
    # Chat history got summarized into this question
    string summarized_question = 3;
    # Previous summarized question attempts retried by this question.
    repeated previous_questions = 4;
    string code_changes = 5;
    # UUID of the hint if it was matched
    optional string hint_id = 6;
    QuestionStatus status =  7;
    string answer = 8;
    string answer_statements = 9;
    bool is_reviewed = 10;

    # =============== Hidden from user ==========================
    string chat_history = 20;
    map<string,string> focused_formula_key_2_hash = 21;
}

message Hint {
    repeated string triggers = 1;
    map<string,string> focused_formula_key_2_hash = 2;
}
```

1. Every accepted question stores its ID into project file.
2. P (owner of the project or user with read-write access) can review every question posted by him or Bs.
3. P may filter/sort, group by (for instance by hint) all the questions
4. For every question P may:
    - Mark question as reviewed
    - ~~(Out of scope) P may apply changes (using delta algorihm) from the question to his current project state and get similar Accept/Discard/Unlock workflow as in read-write workflow.~~
    - Preview the chnanges in `Preview mode`
    - P may attach or detach question to hint (it adds/removes summarized_question from triggers list).
5. Every suggestion applied by P automatically becomes AI hint. 

AI hints can adjust bot behaviour. If AI hint got matched to newly asked question, instead of generating new code, user got focused to the columns mentioned in a hint, data for these columns is provided to bot for summarization. 

**If user thinks that hint was mismatched, we should provide user a button to generate a new answer instead (similarly was added Mindmap)**

We store hashes for focused columns in order to warn P that code for the hint was changed. 
- If hashcode don't match we auto-disable hint
- P may manually auto-actualize hints, by storing new hashcodes or leave hint disabled. 
- Later we may add AI-based auto-verification of chanhged hints.


#### Navigate user to changes 
Every time user press `Focus button`
- If QuestionID is in the project state:
    - We take focused columns (by name) and navigate user there
    - If there is no such name, we try to use hash instead
    - If neither name nor hash not found -> **button doesn't appear.**
- If QuestionID is not in the project state: button doesn't appear.


#### Re-Summarization Protocol Changes

Before change, project state dictionary is dumped into SystemMessage content.
After change, project state is dumped into SystemMessage under `projectState` key.

After change, new `generationParameters` key is optionally expected in SystemMessage:

```python
class Column(BaseModel):
    sheet_name: str
    table_name: str
    column_name: str


class Focus(BaseModel):
    columns: list[Column]


class Attachment(BaseModel):
    title: str = ""
    data: str = ""


class Stage(BaseModel):
    name: str = ""
    content: str = ""
    attachments: list[Attachment] = []


class GenerationParameters(BaseModel):
    # Possibly modified dictionary of stages from previous chat completion
    saved_stages: list[Stage] = []

    # Set of flags controlling re-regeneration of specific stages
    generate_actions: bool | None = None
    generate_focus: bool | None = None
    generate_summary: bool | None = None

    question_status: QuestionStatus = QuestionStatus.UNDECIDED
    # Undecided - bot only do chat completion, no project files will be changed
    # Accepted - bot additionally modify project files, potentially converting answer to AI Hint
    # Discarded - bot additionally saves answer to external storage as bad answer

```

##### Example

```json

{
  "projectState": {
    "input_folder": "files/...",
    "sheets": {}
  },
  "generationParameters": {
    "saved_stages": [
      {
        "name": "Summary",
        "content": "Manually defined summary (by user)"
      },
      {
        "name": "Changed Sheets",
        "attachments": [
          {
            "title": "DSL (<Sheet Name>)",
            "data": "..."
          }
        ]
      },
      {
        "name": "Focus",
        "content": "```json\n{ columns: [] }\n```"
      }
    ],
    "question_status": "ACCEPTED"
  }
}
```

##### Algorithm:

1. UI sends regular chat completion request with no `saved_stages` (`None` or `{}`) and every `generate_*` flag set to `None` (default).
2. Bot generates all required stages and responds back.
3. Every following chat completion request (up to `Accept` or `Discard`, inclusively), UI dumps all **previous** response stages into `saved_stages` parameter (possibly altering) and specifying `generate_` flag if needed (table below).

##### `saved_stages` control names:

1. `Changed Sheets`. Dump of per-sheet DSL attachments. Expected attachment names: `DSL (<sheet_name>)`. Content must be wrapped into Markdown general code block (```<code>```).
2. `Focus`. JSON dump of `Focus` (see `new-workflow.md`), wrapped into Markdown JSON block (```json```).
3. `Summary`. Plain text copy of bot answer message content.

**Interaction Table**:

In new API, every important stage works in conjunction with related `generate_*` flag, separated from other pairs of stage / flag.

1. `Changed Sheets + generate_actions`
2. `Focus + generate_focus`
3. `Summary + generate_summary`

Rows: `saved_stages` particular stage. Columns: `generate_*` flag.

|               | `None`                                   | `True`                             | `False`           |
|---------------|------------------------------------------|------------------------------------|-------------------|
| Stage Missing | Bot generates stage using LLM            | Bot generates stage using LLM      | No stage produced |
| Stage Present | Bot uses provided stage and republish it | Bot generates stage anew using LLM | No stage produced |
