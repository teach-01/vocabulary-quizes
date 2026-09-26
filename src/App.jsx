import React, { useEffect, useMemo, useState } from "react";
import { starterSets } from "./data";

const STORAGE = "vocab_quiz_sets_v1";

/* =========================================================
   LOAD DATA
========================================================= */

function normalizeSets(rawSets) {
  if (!Array.isArray(rawSets)) return [];

  const result = [];

  rawSets.forEach((set) => {
    // Supports the original data.js structure:
    // { id: "set-1", name: "Set 1", subSets: [...] }
    if (Array.isArray(set.subSets)) {
      set.subSets.forEach((subSet) => {
        result.push({
          ...subSet,
          questions: Array.isArray(subSet.questions)
            ? subSet.questions
            : [],
        });
      });
      return;
    }

    // Also supports already-flat sets:
    // { id, name: "Set 1.1", questions: [...] }
    if (set && typeof set === "object") {
      result.push({
        ...set,
        questions: Array.isArray(set.questions)
          ? set.questions
          : [],
      });
    }
  });

  return result;
}

function loadSets() {
  try {
    const saved = localStorage.getItem(STORAGE);

    if (saved) {
      return normalizeSets(JSON.parse(saved));
    }

    return normalizeSets(starterSets);
  } catch (error) {
    console.error("Error loading sets:", error);
    return normalizeSets(starterSets);
  }
}


/* =========================================================
   APP
========================================================= */

function App() {
  const [sets, setSets] = useState(loadSets);
  const [page, setPage] = useState("home");
  const [selectedSet, setSelectedSet] = useState(null);
  const [result, setResult] = useState(null);

  /* Save data automatically */
  useEffect(() => {
    localStorage.setItem(
      STORAGE,
      JSON.stringify(sets)
    );
  }, [sets]);


  /* Start Quiz */
  const startQuiz = (set) => {
    setSelectedSet(set);
    setResult(null);
    setPage("quiz");
  };


  /* Finish Quiz */
  const finishQuiz = (data) => {
    setResult(data);
    setPage("result");
  };


  /* Add New Set */
  const addSet = (name) => {
    const clean = name.trim();

    if (!clean) {
      alert("Set name enter karo.");
      return;
    }

    const newSet = {
      id: crypto.randomUUID(),
      name: clean,
      questions: [],
    };

    setSets((prev) => [
      ...prev,
      newSet,
    ]);
  };


  /* Delete Set - ADMIN ONLY */
  const deleteSet = (id) => {
    const setToDelete = sets.find(
      (s) => s.id === id
    );

    if (!setToDelete) {
      return;
    }

    const confirmDelete = window.confirm(
      `Delete "${setToDelete.name}" and all its questions?`
    );

    if (!confirmDelete) {
      return;
    }

    setSets((prev) =>
      prev.filter(
        (s) => s.id !== id
      )
    );
  };


  /* Add Question */
  const saveQuestion = (
    setId,
    question
  ) => {
    setSets((prev) =>
      prev.map((s) => {
        if (s.id !== setId) {
          return s;
        }

        return {
          ...s,
          questions: [
            ...s.questions,
            {
              ...question,
              id: crypto.randomUUID(),
            },
          ],
        };
      })
    );
  };


  /* Delete Question */
  const deleteQuestion = (
    setId,
    questionId
  ) => {
    const confirmDelete =
      window.confirm(
        "Delete this question?"
      );

    if (!confirmDelete) {
      return;
    }

    setSets((prev) =>
      prev.map((s) =>
        s.id === setId
          ? {
              ...s,
              questions:
                s.questions.filter(
                  (q) =>
                    q.id !== questionId
                ),
            }
          : s
      )
    );
  };


  /* Edit Question */
  const editQuestion = (
    setId,
    questionId,
    updated
  ) => {
    setSets((prev) =>
      prev.map((s) =>
        s.id === setId
          ? {
              ...s,
              questions:
                s.questions.map(
                  (q) =>
                    q.id === questionId
                      ? {
                          ...q,
                          ...updated,
                        }
                      : q
                ),
            }
          : s
      )
    );
  };


  return (
    <div className="app">

      {/* =================================================
          HEADER
      ================================================= */}

      <header className="topbar">

        <div className="brand">
          Vocabulary Quiz
        </div>

        <nav>

          <button
            className={
              page === "home"
                ? "nav active"
                : "nav"
            }
            onClick={() =>
              setPage("home")
            }
          >
            Sets
          </button>

          

        </nav>

      </header>


      {/* =================================================
          MAIN
      ================================================= */}

      <main className="container">

        {/* HOME */}

        {page === "home" && (
          <Home
            sets={sets}
            startQuiz={startQuiz}
          />
        )}


        {/* QUIZ */}

        {page === "quiz" &&
          selectedSet && (
            <Quiz
              set={selectedSet}
              onFinish={finishQuiz}
              onBack={() =>
                setPage("home")
              }
            />
          )}


        {/* RESULT */}

        {page === "result" &&
          result && (
            <Result
              result={result}
              onHome={() =>
                setPage("home")
              }
            />
          )}


        {/* ADMIN */}

        

      </main>

    </div>
  );
}


/* =========================================================
   HOME
========================================================= */

function Home({
  sets,
  startQuiz,
}) {

  const [
    selectedParent,
    setSelectedParent,
  ] = useState(null);


  /* =======================================================
     GROUP SETS

     Set 1.1
     Set 1.2

     becomes:

     Set 1
       ├── Set 1.1
       └── Set 1.2

     Set 2.1
     Set 2.2

     becomes:

     Set 2
       ├── Set 2.1
       └── Set 2.2
  ======================================================= */

  const groupedSets =
    useMemo(() => {

      const groups = {};


      sets.forEach((set) => {

        /*
          IMPORTANT:
          Correct regex is:

          /^(Set\s+\d+)\.\d+$/i

          NOT:

          **\\.**
        */

        const match =
          set.name.match(
            /^(Set\s+\d+)\.\d+$/i
          );


        if (match) {

          const parentName =
            match[1];


          if (!groups[parentName]) {
            groups[parentName] = [];
          }


          groups[parentName].push(
            set
          );
        }

      });


      /* Sort Set 1, Set 2, Set 3... */

      return Object.entries(
        groups
      )
        .sort((a, b) => {

          const numA =
            parseInt(
              a[0].match(
                /\d+/
              )?.[0] || 0
            );

          const numB =
            parseInt(
              b[0].match(
                /\d+/
              )?.[0] || 0
            );

          return numA - numB;

        })

        .map(
          ([parentName, children]) => {

            /* Sort 1.1, 1.2, 1.3 */

            children.sort(
              (a, b) => {

                const partA =
                  parseInt(
                    a.name.match(
                      /\.(\d+)$/
                    )?.[1] || 0
                  );

                const partB =
                  parseInt(
                    b.name.match(
                      /\.(\d+)$/
                    )?.[1] || 0
                  );

                return partA - partB;
              }
            );

            return [
              parentName,
              children,
            ];
          }
        );

    }, [sets]);


  /* =======================================================
     SELECTED PARENT
  ======================================================= */

  if (selectedParent) {

    const children =
      groupedSets.find(
        ([name]) =>
          name === selectedParent
      )?.[1] || [];


    return (
      <>

        <section className="hero">

          <div>

            <button
              className="back"
              onClick={() =>
                setSelectedParent(null)
              }
            >
              ← All Sets
            </button>


            <p className="eyebrow">
              VOCABULARY PRACTICE
            </p>


            <h1>
              {selectedParent}
            </h1>


            <p className="muted">
              Choose a part and
              start your quiz.
            </p>

          </div>

        </section>


        <div className="grid">

          {children.map((set) => (

            <div
              className="card set-card"
              key={set.id}
            >

              <div>

                <span className="badge">
                  {set.questions.length}{" "}
                  Questions
                </span>


                <h2>
                  {set.name}
                </h2>


                <p className="muted">
                  {set.name} 
                </p>

              </div>


              <div className="actions">

                <button
                  className="primary"
                  disabled={
                    !set.questions.length
                  }
                  onClick={() =>
                    startQuiz(set)
                  }
                >
                  Start Quiz
                </button>

              </div>

            </div>

          ))}


          {children.length === 0 && (
            <div className="empty">
              
            </div>
          )}

        </div>

      </>
    );
  }


  /* =======================================================
     MAIN SET SCREEN
  ======================================================= */

  return (
    <>

      <section className="hero">

        <div>

          <p className="eyebrow">
            100 SET VOCABULARY
            PRACTICE
          </p>


          <h1>
            Choose a Set & Start Quiz
          </h1>


          <p className="muted">
          </p>

        </div>

      </section>


      <div className="grid">

  {groupedSets.map(
    ([parentName, children]) => {

      const totalQuestions = 100;

      return (

        <div
          className="card set-card"
          key={parentName}
        >

          <div>

            <span className="badge">
              {totalQuestions} Questions
            </span>

            <h2>
              {parentName}
            </h2>

            <p className="muted">
              {children.length}{" "}
              Parts available
            </p>

          </div>

          <div className="actions">

            <button
              className="primary"
              onClick={() =>
                setSelectedParent(
                  parentName
                )
              }
            >
              View {parentName}
            </button>

          </div>

        </div>

      );
    }
  )}




        {groupedSets.length === 0 && (

          <div className="empty">
            अभी कोई Set available
            नहीं है।
          </div>

        )}

      </div>

    </>
  );
}


/* =========================================================
   QUIZ
========================================================= */

function Quiz({
  set,
  onFinish,
  onBack,
}) {

  const [
    answers,
    setAnswers,
  ] = useState({});


  const [
    current,
    setCurrent,
  ] = useState(0);


  const q =
    set.questions[current];


  /* Select answer */

  const choose = (idx) => {

    setAnswers((prev) => ({
      ...prev,
      [q.id]: idx,
    }));

  };


  /* Submit quiz */

  const submit = () => {

    const review =
      set.questions.map(
        (question, i) => {

          const selected =
            answers[
              question.id
            ];


          return {

            number: i + 1,

            question:
              question.question,

            options:
              question.options,

            selected,

            correct:
              question.answer,

            explanation:
              question.explanation ||
              "",

          };

        }
      );


    const correct =
      review.filter(
        (x) =>
          x.selected ===
          x.correct
      ).length;


    const wrong =
      review.filter(
        (x) =>
          x.selected !==
            undefined &&
          x.selected !==
            x.correct
      ).length;


    const unattempted =
      review.filter(
        (x) =>
          x.selected ===
          undefined
      ).length;


    onFinish({

      setName:
        set.name,

      total:
        review.length,

      correct,

      wrong,

      unattempted,

      review,

    });

  };


  if (!q) {

    return (
      <div className="empty">
        
      </div>
    );

  }


  const progress =
    ((current + 1) /
      set.questions.length) *
    100;


  return (

    <section>

      <div className="quiz-head">

        <div>

          <button
            className="back"
            onClick={onBack}
          >
            ← Back
          </button>


          <h1>
            {set.name}
          </h1>


          <p className="muted">
            Question{" "}
            {current + 1}{" "}
            of{" "}
            {set.questions.length}
          </p>

        </div>


        <div className="progress">

          <div
            style={{
              width:
                `${progress}%`,
            }}
          />

        </div>

      </div>


      <div className="quiz-card">

        <div className="question-no">
          Question{" "}
          {current + 1}
        </div>


        <h2>
          {q.question}
        </h2>


        <div className="options">

          {q.options.map(
            (option, idx) => (

              <button
                key={idx}
                className={
                  answers[q.id] ===
                  idx
                    ? "option selected"
                    : "option"
                }
                onClick={() =>
                  choose(idx)
                }
              >

                <span>
                  {String.fromCharCode(
                    65 + idx
                  )}
                </span>

                {option}

              </button>

            )
          )}

        </div>


        <div className="quiz-actions">

          <button
            className="secondary"
            disabled={
              current === 0
            }
            onClick={() =>
              setCurrent(
                (v) => v - 1
              )
            }
          >
            Previous
          </button>


          {current <
          set.questions.length -
            1 ? (

            <button
              className="primary"
              onClick={() =>
                setCurrent(
                  (v) => v + 1
                )
              }
            >
              Next
            </button>

          ) : (

            <button
              className="success"
              onClick={submit}
            >
              Submit Quiz
            </button>

          )}

        </div>

      </div>

    </section>

  );
}


/* =========================================================
   RESULT
========================================================= */

function Result({
  result,
  onHome,
}) {

  const percent =
    result.total
      ? Math.round(
          (result.correct /
            result.total) *
            100
        )
      : 0;


  return (

    <section>

      <div className="result-hero">

        <button
          className="back"
          onClick={onHome}
        >
          ← All Sets
        </button>


        <h1>
          {result.setName} —
          Result
        </h1>


        <div className="score">
          {percent}%
        </div>


        <p>
          {result.correct}
          {" "}correct out of{" "}
          {result.total}
        </p>

      </div>


      <div className="stats">

        <Stat
          label="Total"
          value={
            result.total
          }
        />


        <Stat
          label="Correct"
          value={
            result.correct
          }
          cls="green"
        />


        <Stat
          label="Wrong"
          value={
            result.wrong
          }
          cls="red"
        />


        <Stat
          label="Unattempted"
          value={
            result.unattempted
          }
          cls="orange"
        />

      </div>


      <h2 className="review-title">
        Question Review
      </h2>


      <div className="review-list">

        {result.review.map(
          (item) => {

            const isCorrect =
              item.selected ===
              item.correct;


            const isSkipped =
              item.selected ===
              undefined;


            return (

              <div
                className={
                  `review ${
                    isSkipped
                      ? "skipped"
                      : isCorrect
                      ? "correct"
                      : "wrong"
                  }`
                }
                key={
                  item.number
                }
              >

                <div className="review-top">

                  <b>
                    Q{item.number}.{" "}
                    {item.question}
                  </b>


                  <span>

                    {isSkipped
                      ? "Unattempted"
                      : isCorrect
                      ? "Correct"
                      : "Wrong"}

                  </span>

                </div>


                <p>

                  Your answer:{" "}

                  <b>

                    {isSkipped
                      ? "Not answered"
                      : item.options[
                          item.selected
                        ]}

                  </b>

                </p>


                <p>

                  Correct answer:{" "}

                  <b>

                    {
                      item.options[
                        item.correct
                      ]
                    }

                  </b>

                </p>


                {item.explanation && (

                  <p className="explanation">
                    {item.explanation}
                  </p>

                )}

              </div>

            );

          }
        )}

      </div>

    </section>

  );
}


/* =========================================================
   STAT
========================================================= */

function Stat({
  label,
  value,
  cls = "",
}) {

  return (

    <div
      className={`stat ${cls}`}
    >

      <span>
        {label}
      </span>


      <strong>
        {value}
      </strong>

    </div>

  );
}


/* =========================================================
   ADMIN
========================================================= */

function Admin({
  sets,
  addSet,
  deleteSet,
  saveQuestion,
  deleteQuestion,
  editQuestion,
}) {

  const [
    newSet,
    setNewSet,
  ] = useState("");


  const [
    activeSet,
    setActiveSet,
  ] = useState(
    sets[0]?.id || ""
  );


  const [
    form,
    setForm,
  ] = useState({

    question: "",

    options: [
      "",
      "",
      "",
      "",
    ],

    answer: 0,

    explanation: "",

  });


  const selectedSet =
    sets.find(
      (s) =>
        s.id === activeSet
    );


  /* Keep selected set valid */

  useEffect(() => {

    if (
      !sets.some(
        (s) =>
          s.id === activeSet
      )
    ) {

      setActiveSet(
        sets[0]?.id || ""
      );

    }

  }, [
    sets,
    activeSet,
  ]);


  /* Update option */

  const updateOption = (
    index,
    value
  ) => {

    setForm((prev) => ({

      ...prev,

      options:
        prev.options.map(
          (option, i) =>
            i === index
              ? value
              : option
        ),

    }));

  };


  /* Add set */

  const handleAddSet = () => {

    if (!newSet.trim()) {

      alert(
        "Set name enter karo."
      );

      return;
    }


    addSet(newSet);

    setNewSet("");

  };


  /* Add question */

  const submitQuestion = (
    e
  ) => {

    e.preventDefault();


    if (!selectedSet) {

      alert(
        "Pehle Set create/select karo."
      );

      return;
    }


    if (
      !form.question.trim() ||
      form.options.some(
        (x) =>
          !x.trim()
      )
    ) {

      alert(
        "Question aur saare 4 options fill karo."
      );

      return;
    }


    saveQuestion(
      activeSet,
      form
    );


    setForm({

      question: "",

      options: [
        "",
        "",
        "",
        "",
      ],

      answer: 0,

      explanation: "",

    });

  };


  return (

    <section>

      {/* ADMIN HEADER */}

      <div className="admin-head">

        <div>

          <p className="eyebrow">
            ADMIN
          </p>


          <h1>
            Manage Sets &
            Questions
          </h1>


          <p className="muted">
            
          </p>

        </div>

      </div>


      <div className="admin-grid">

        {/* =================================================
            SET MANAGEMENT
        ================================================= */}

        <div className="panel">

          <h2>
            Create New Set
          </h2>


          <div className="inline-form">

            <input
              value={newSet}
              onChange={(e) =>
                setNewSet(
                  e.target.value
                )
              }
              placeholder="e.g. Set 1.1"
            />


            <button
              className="primary"
              onClick={
                handleAddSet
              }
            >
              Add Set
            </button>

          </div>


          <h2 className="mt">
            Select Set
          </h2>


          {sets.length === 0 ? (

            <p className="muted">
              No sets available.
            </p>

          ) : (

            <select
              value={
                activeSet
              }
              onChange={(e) =>
                setActiveSet(
                  e.target.value
                )
              }
            >

              {sets.map(
                (set) => (

                  <option
                    key={set.id}
                    value={set.id}
                  >

                    {set.name}{" "}
                    (
                    {
                      set.questions
                        .length
                    }
                    )

                  </option>

                )
              )}

            </select>

          )}


          {/* DELETE SET
              ONLY ADMIN */}

          

        </div>


        {/* =================================================
            ADD QUESTION
        ================================================= */}

        <form
          className="panel"
          onSubmit={
            submitQuestion
          }
        >

          <h2>
            Add Question
          </h2>


          <textarea
            value={
              form.question
            }
            onChange={(e) =>
              setForm({
                ...form,
                question:
                  e.target.value,
              })
            }
            placeholder="Question..."
          />


          {form.options.map(
            (option, index) => (

              <div
                className="option-row"
                key={index}
              >

                <span>
                  {String.fromCharCode(
                    65 + index
                  )}
                </span>


                <input
                  value={option}
                  onChange={(e) =>
                    updateOption(
                      index,
                      e.target.value
                    )
                  }
                  placeholder={
                    `Option ${String.fromCharCode(
                      65 + index
                    )}`
                  }
                />

              </div>

            )
          )}


          <label>
            Correct Answer
          </label>


          <select
            value={
              form.answer
            }
            onChange={(e) =>
              setForm({
                ...form,
                answer:
                  Number(
                    e.target.value
                  ),
              })
            }
          >

            {form.options.map(
              (_, index) => (

                <option
                  key={index}
                  value={index}
                >

                  Option{" "}
                  {String.fromCharCode(
                    65 + index
                  )}

                </option>

              )
            )}

          </select>


          <textarea
            value={
              form.explanation
            }
            onChange={(e) =>
              setForm({
                ...form,
                explanation:
                  e.target.value,
              })
            }
            placeholder="Explanation..."
          />


          <button
            className="primary full"
            type="submit"
          >
            Add Question
          </button>

        </form>

      </div>


      {/* =================================================
          QUESTION MANAGER
      ================================================= */}

      {selectedSet && (

        <div className="panel question-manager">

          <div className="list-head">

            <h2>

              {selectedSet.name}
              {" — "}
              {
                selectedSet
                  .questions
                  .length
              }{" "}
              Questions

            </h2>

          </div>


          {selectedSet.questions
            .length === 0 ? (

            <p className="muted">
              No questions yet.
            </p>

          ) : (

            selectedSet.questions.map(
              (question, index) => (

                <QuestionRow
                  key={
                    question.id
                  }

                  q={
                    question
                  }

                  index={
                    index
                  }

                  onDelete={() =>
                    deleteQuestion(
                      selectedSet.id,
                      question.id
                    )
                  }

                  onEdit={(
                    updated
                  ) =>
                    editQuestion(
                      selectedSet.id,
                      question.id,
                      updated
                    )
                  }
                />

              )
            )

          )}

        </div>

      )}

    </section>

  );
}


/* =========================================================
   QUESTION ROW
========================================================= */

function QuestionRow({
  q,
  index,
  onDelete,
  onEdit,
}) {

  const [
    editing,
    setEditing,
  ] = useState(false);


  const [
    draft,
    setDraft,
  ] = useState(q);


  /* Update draft when q changes */

  useEffect(() => {

    setDraft(q);

  }, [q]);


  /* Save edited question */

  const saveEdit = () => {

    if (
      !draft.question.trim()
    ) {

      alert(
        "Question empty nahi ho sakta."
      );

      return;
    }


    if (
      draft.options.some(
        (option) =>
          !option.trim()
      )
    ) {

      alert(
        "Saare 4 options fill karo."
      );

      return;
    }


    onEdit(draft);

    setEditing(false);

  };


  /* EDIT MODE */

  if (editing) {

    return (

      <div className="edit-box">

        <textarea
          value={
            draft.question
          }
          onChange={(e) =>
            setDraft({
              ...draft,
              question:
                e.target.value,
            })
          }
        />


        {draft.options.map(
          (option, index) => (

            <input
              key={index}
              value={option}
              onChange={(e) => {

                const newOptions =
                  [
                    ...draft.options,
                  ];

                newOptions[
                  index
                ] =
                  e.target.value;


                setDraft({
                  ...draft,
                  options:
                    newOptions,
                });

              }}
              placeholder={
                `Option ${String.fromCharCode(
                  65 + index
                )}`
              }
            />

          )
        )}


        <select
          value={
            draft.answer
          }
          onChange={(e) =>
            setDraft({
              ...draft,
              answer:
                Number(
                  e.target.value
                ),
            })
          }
        >

          {draft.options.map(
            (_, index) => (

              <option
                key={index}
                value={index}
              >

                Option{" "}
                {String.fromCharCode(
                  65 + index
                )}

              </option>

            )
          )}

        </select>


        <textarea
          value={
            draft.explanation ||
            ""
          }
          onChange={(e) =>
            setDraft({
              ...draft,
              explanation:
                e.target.value,
            })
          }
          placeholder="Explanation..."
        />


        <div className="row-actions">

          <button
            className="success"
            onClick={
              saveEdit
            }
          >
            Save
          </button>


          <button
            className="secondary"
            onClick={() =>
              setEditing(false)
            }
          >
            Cancel
          </button>

        </div>

      </div>

    );
  }


  /* NORMAL MODE */

  return (

    <div className="question-row">

      <div>

        <b>
          Q{index + 1}.{" "}
          {q.question}
        </b>


        <p className="muted">

          Answer:{" "}

          {String.fromCharCode(
            65 + q.answer
          )}

          {" · "}

          {
            q.options[
              q.answer
            ]
          }

        </p>

      </div>


      <div className="row-actions">

        <button
          className="secondary"
          onClick={() =>
            setEditing(true)
          }
        >
          Edit
        </button>


        <button
          className="danger-outline"
          onClick={
            onDelete
          }
        >
          Delete
        </button>

      </div>

    </div>

  );
}


/* =========================================================
   EXPORT
========================================================= */

export default App;