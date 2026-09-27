// ===================== pokemon_learning.js (학습 데이터 업로드 + 퀴즈) =====================
// 정답/오답 처리는 콜백(setQuizAnswerHandlers)으로 위임해 다른 파일이 이 퀴즈를 재사용할 수
// 있게 함(구조는 MODULARIZATION_PLAN.md 참고). 로드 순서: script.js 다음, pokemon_catch.js보다 먼저.

const uploadBtn  = document.getElementById('upload-btn');
const excelInput = document.getElementById('excel-input');

const quizModal    = document.getElementById('quiz-modal');
const quizCloseBtn = document.getElementById('quiz-close-btn');
const quizQuestion = document.getElementById('quiz-question');
const quizOptions  = document.getElementById('quiz-options');
const quizFeedback = document.getElementById('quiz-feedback');

// 결과 화면 요소
let wordList = [];
const QUIZ_MIN_WORDS = 4; // 4지선다를 위해 최소 4개 단어 필요

// 포켓볼 / 도망치기 보유 개수 (기본 1개씩 제공, 퀴즈 정답 시 각각 +1)
let quizCorrectCount = 0;
let quizWrongCount   = 0;

// 포획한 포켓몬 목록 (포획한 순서대로 저장: { id, name, bst })
uploadBtn.addEventListener('click', () => {
    excelInput.click();
});

excelInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
        try {
            const data = new Uint8Array(evt.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

            let parsedList = rows
                .filter(row => row && row[0] !== undefined && row[0] !== '' && row[1] !== undefined && row[1] !== '')
                .map(row => ({ en: String(row[0]).trim(), kr: String(row[1]).trim() }));

            const distinctMeanings = new Set(parsedList.map(w => w.kr)).size;
            const uploadFeedbackEl = document.getElementById('data-upload-feedback');
            if (distinctMeanings < QUIZ_MIN_WORDS) {
                if (uploadFeedbackEl) {
                    uploadFeedbackEl.textContent = `뜻이 다른 단어가 ${QUIZ_MIN_WORDS}개 이상 필요합니다 (현재 ${distinctMeanings}개)`;
                    uploadFeedbackEl.classList.remove('success');
                    uploadFeedbackEl.classList.add('error');
                }
                excelInput.value = '';
                return;
            }

            if (window.uploadLearningDataToFirebase) {
                window.uploadLearningDataToFirebase(parsedList);
            }
        } catch (err) {
            const uploadFeedbackEl = document.getElementById('data-upload-feedback');
            if (uploadFeedbackEl) {
                uploadFeedbackEl.textContent = '파일을 읽을 수 없습니다. 다시 업로드해주세요';
                uploadFeedbackEl.classList.remove('success');
                uploadFeedbackEl.classList.add('error');
            }
            excelInput.value = '';
        }
    };
    reader.readAsArrayBuffer(file);
});

window.applyLearningData = function(questions, title) {
    wordList = questions;
    const startBtn = document.getElementById('start-btn');
    if(startBtn) startBtn.disabled = false;
};

// 로그아웃 시 화면 표시용 학습 데이터 선택 상태를 비움(계정에 저장된 선택 기록 자체는
// 그대로 남아있어서, 다음에 로그인하면 auth_manager.js가 다시 자동으로 applyLearningData를 불러줌)
window.resetLearningDataLocal = function() {
    wordList = [];
    const startBtn = document.getElementById('start-btn');
    if (startBtn) startBtn.disabled = true;
};

// ===================== 4지선다 퀴즈 =====================

let currentQuiz = null; // { en, correctKr, options }
let quizAnswered = true; // 현재 문제가 이미 풀렸는지 여부 (닫기 후 재입장 시 새 문제를 낼지 판단)

// 배열을 무작위로 섞은 새 배열 반환 (Fisher–Yates)
function shuffleArray(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// 단어 목록에서 무작위 문제(정답 1개 + 오답 3개) 출제
function pickQuizQuestion() {
    const correctIndex = Math.floor(Math.random() * wordList.length);
    const correct = wordList[correctIndex];

    // 오답 보기는 정답과 뜻이 다르고 서로도 겹치지 않는 것만 — 같은 뜻이 두 칸에 나오면 정답 글자를 눌러도
    // 오답 처리되거나 정답 표시가 두 칸에 붙음(textContent로 판정하기 때문)
    const wrongKrs = [...new Set(wordList.map(w => w.kr))].filter(kr => kr !== correct.kr);
    const wrongs = shuffleArray(wrongKrs).slice(0, 3);

    currentQuiz = {
        en: correct.en,
        correctKr: correct.kr,
        options: shuffleArray([correct.kr, ...wrongs])
    };
    quizAnswered = false;
    renderQuiz();
}

// 보기 버튼 텍스트가 2줄(버튼 높이) 안에 다 들어가도록, 넘칠 경우 폰트 크기를 점점 줄여서 맞춤
function fitOptionButtonText(btn) {
    const MAX_FONT_SIZE = 14;
    const MIN_FONT_SIZE = 9;
    const LINE_HEIGHT_RATIO = 1.3;

    let fontSize = MAX_FONT_SIZE;
    btn.style.fontSize   = fontSize + 'px';
    btn.style.lineHeight = Math.round(fontSize * LINE_HEIGHT_RATIO) + 'px';

    while (btn.scrollHeight > btn.clientHeight + 1 && fontSize > MIN_FONT_SIZE) {
        fontSize -= 1;
        btn.style.fontSize   = fontSize + 'px';
        btn.style.lineHeight = Math.round(fontSize * LINE_HEIGHT_RATIO) + 'px';
    }
}

// 현재 문제를 퀴즈 모달에 렌더링
function renderQuiz() {
    quizFeedback.textContent = '';
    quizQuestion.textContent = currentQuiz.en;
    quizOptions.innerHTML = '';

    currentQuiz.options.forEach(optionText => {
        const optBtn = document.createElement('button');
        optBtn.className = 'quiz-option-btn';
        optBtn.textContent = optionText;
        optBtn.addEventListener('click', () => handleQuizAnswer(optionText, optBtn));
        quizOptions.appendChild(optBtn);
        fitOptionButtonText(optBtn);
    });
}

// 정답/오답 처리를 콜백으로 위임(현재는 pokemon_catch.js가 몬스터볼/도망치다 +1·-1로 등록) —
// 다른 파일이 같은 퀴즈를 다른 용도로 재사용해도 이 파일 자체는 수정할 필요 없음.
let quizOnCorrect = () => {};
let quizOnWrong = () => {};
function setQuizAnswerHandlers(onCorrect, onWrong) {
    quizOnCorrect = onCorrect || (() => {});
    quizOnWrong = onWrong || (() => {});
}

// 보기 선택 처리: 정답/오답 판정과 다음 문제 진행만 이 함수의 책임이고, "정답이면/오답이면
// 무엇을 줄지"는 quizOnCorrect/quizOnWrong 콜백(위 setQuizAnswerHandlers로 등록됨)에 위임함
function handleQuizAnswer(selectedText, selectedBtn) {
    const optionBtns = Array.from(quizOptions.querySelectorAll('button'));
    optionBtns.forEach(b => (b.disabled = true));
    quizAnswered = true;

    const isCorrect = selectedText === currentQuiz.correctKr;

    if (isCorrect) {
        quizCorrectCount++;
        selectedBtn.classList.add('correct');
        quizOnCorrect();

        setTimeout(() => {
            if (!quizModal.classList.contains('hidden')) pickQuizQuestion();
        }, 500);
    } else {
        quizWrongCount++;
        selectedBtn.classList.add('wrong');
        optionBtns.forEach(b => {
            if (b.textContent === currentQuiz.correctKr) b.classList.add('correct');
        });
        quizOnWrong();

        setTimeout(() => {
            if (!quizModal.classList.contains('hidden')) pickQuizQuestion();
        }, 1300);
    }
}

quizCloseBtn.addEventListener('click', () => {
    quizModal.classList.add('hidden');
});

// 게임(재)시작 공통 로직 — 최초 시작(시작하기)과 다시하기 모두에서 사용
