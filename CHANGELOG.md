# 포켓몬 배틀 프리뷰 — 패치 정리 (세션 종료 시점 기준)

이 문서는 `pokemon_catch_game9`에 "포켓몬 배틀" 기능을 추가하면서 진행한 작업을 정리한 것. 다음 패치 작업 시작 전에 이 문서부터 읽고 이어가면 됨.

**현재 버전: 1.3** (2026-09-27 등록).

## 작성 지침

이 문서를 작성·갱신할 때는 다음 규칙을 따른다.

**패치 번호**
1. 완료된 패치는 `## N.` 형식으로 번호를 매긴다. 하이픈 표기(예: 9-N)는 사용하지 않으며, 0부터 시작하여 결번 없이 연속으로 부여한다.
2. "다음 패치 후보 (미구현)" 섹션에는 번호를 붙이지 않는다. 완료된 이력이 아니라 할 일 목록이기 때문이다.
3. 본문에서 다른 패치를 인용할 때도 하이픈 없는 순수 번호를 사용한다(예: "38에서 만든"). 조사(은/는/이/가/을/를/과/와)는 해당 번호의 발음(끝자리가 모음이면 는/가/를/와, 자음이면 은/이/을/과)에 맞게 표기한다.
4. 같은 요소를 같은 목표로 짧은 시간 안에 여러 번 미세 조정하는 경우(예: 간격 값을 7px→11px→9px로 연속 조정), 매번 별도 번호를 부여하지 않는다. 값이 최종 확정된 시점에 그 과정 전체를 패치 하나로 묶어 기록한다.

**버전**
1. 버전 번호(1.0, 1.1, ...)는 사용자가 명시적으로 버전을 올리라고 지시할 때만 갱신한다. 세션 또는 작업 단위가 종료되었다는 이유만으로 자동 갱신하지 않는다.
2. 새 버전을 확정할 때는 다음을 함께 갱신한다: 문서 상단의 "현재 버전" 줄, "버전별 요약"에 추가하는 `### Version X.Y — <제목> (<번호 범위>)` 항목. 번호 범위의 시작은 직전 버전 범위의 끝 다음 번호로 이어지게 한다.
3. 각 버전 요약은 불릿 없이 문단(prose) 형식으로 작성하고, 해당 버전에서 수행한 작업의 핵심만 압축한다.

**패치 이력의 기록 위치**
1. 패치 번호와 버전명은 `CHANGELOG.md`와 `MODULARIZATION_PLAN.md` 두 파일에만 기록한다.
2. 그 외 코드 파일(index.html, style.css, *.js 등)에는 패치 번호나 버전명을 어떤 형태로도 남기지 않는다. 코드 주석에는 변경 이유에 대한 설명만 남긴다.

**패치 항목 작성 요령**
각 패치 항목에는 다음을 포함한다.
1. 사용자의 실제 요청 또는 지적을 원문 그대로 인용
2. 원인 분석(버그 수정의 경우) 또는 구현 내용(기능 추가의 경우) — 관련 파일명·함수명 명시
3. 검증 방법(`node --check` 통과 여부, 육안 확인, 사용자 확인 등)

**대규모 재정리 시 주의사항**
패치 번호를 일괄 재배정할 때는 코드 내 다른 "N-M" 형태 데이터(포켓몬 폼 ID 등)나 날짜 표기가 함께 변경되지 않도록 사전에 전수 조사한다.

## 버전별 요약

### Version 1.0 — 배틀 프리뷰부터 3v3 AI 트레이너 배틀 시스템까지 (0~64)

시작화면을 "포켓몬 포획"/"포켓몬 배틀"/"포켓몬 도감" 3개 버튼으로 분리하고, 아직 실전 전투 로직은 없는 "배틀 프리뷰"(야생 포켓몬 등장 → 공격하기로 hp만 깎기 → 기절하면 다음 포켓몬, 승패 개념 없음)를 처음 구현. 외부 팬게임 3종(Another Red, pokerogue-beta, another_red_aio)에서 내 포켓몬 뒷모습 스프라이트를 추출해 앞모습과 1:1 대응시키는 작업을 여러 차례에 걸쳐 진행했고, 잘못된 심볼 매칭·GIF가 PNG로 위장된 파일·정지 이미지 크기 보정 등 스프라이트 개별 결함도 다수 발견해 수정. HP바는 원본 게임(RPG Maker/Pokemon Essentials) 데이터를 직접 리서치해 색상 기준(50%/25%)과 애니메이션 방식을 재현했고, 기절 연출도 다른 팬게임 로직을 참고해 "발밑부터 땅에 잠기는" 방식으로 구현. 스프라이트-hp바 배치 방식은 대각선 배치 → 실측 크기 기반 회피 계산 → 원본 게임 방식(고정 앵커)까지 여러 차례 전면 재설계를 거쳐 "각 정보블록이 자기 스프라이트에 붙는" 최종 형태로 정착. 배틀 상대 선택 화면은 전용 목록+슬롯 구조로 시작해, 이후 포켓몬 도감 화면을 "선택 모드"로 재사용하는 구조로 교체(최대 3마리 슬롯). 타입 데이터를 새로 추출해 배틀 화면에 CP 대신 타입 뱃지를 표시. 이 과정에서 배틀 프리뷰 비동기 처리가 실제 포획 게임의 몬스터볼 위치 계산에 영향을 준 버그도 발견해 수정. 이후 이 배틀 프리뷰를 야생 포켓몬 관찰에서 AI 트레이너와의 3대3 대결로 전면 개편 — 실제 게임 데이터(types.dat/moves.dat)를 파싱해 타입 상성표를 반영했고, 기술은 물리/특수/랭크업/회복 4개 고정 버튼으로 단순화(물리·특수는 자기 속성 기준 상성 계산). 포켓몬 교체를 턴을 쓰는 행동으로 바꾸고 AI도 스스로 판단해 교체하도록 구현했으며, 자진 교체·강제 교체(기절) UI를 액션박스 안 이름 버튼 목록으로 통일. 이후 다수의 다듬기 작업 진행: 교체·기절 시 페이드 연출을 상대 쪽과 통일, 배틀 멘트 속도를 포획 게임과 일치, 멘트 문구를 실제 게임 어투(상성 5단계, "상대 {이름}" 표기)로 정리, 배틀 시작 시 "상대가 ~ 내보냈다!" → 상대 등장 → "가랏! ~!" → 내 포켓몬 등장 순서로 연출 추가, 여러 페이드인·HP바 타이밍 버그 수정, 승패 결과 화면을 포획 게임 결과 화면과 완전히 동일한 디자인으로 통일.

### Version 1.1 — 코드 모듈화 및 배틀 뒤로가기 버튼 아이콘화 (65~77)

동작 변경 없는 순수 리팩터링으로 5,747줄짜리 `script.js` 하나를 공용 레이어(`script.js`)와 도메인별 파일(`pokemon_learning.js`/`pokemon_pokedex.js`/`pokemon_catch.js`/`pokemon_battle.js`) + 데이터 파일들로 10개 파일에 재배치(전체를 로드 순서대로 이어붙여 `node --check` 통과까지 검증). 이어서 배틀 기술/교체 메뉴의 뒤로가기(‹) 텍스트 버튼을 `left_arrow.png` 8프레임 스프라이트 애니메이션 아이콘으로 교체하고, 투명 배경 미적용·화살표가 액션박스 테두리(이미지에 그려진 검은 선)와 겹치는 문제·화살표 끝-테두리 간격이 상/좌 비대칭으로 보이던 문제(평균 기준 → 애니메이션이 가장 왼쪽으로 이동했을 때 기준으로 재조정)를 순차적으로 수정. 마지막으로 더미/충돌 코드 여부를 전수 점검(해당 사항 없음 확인)하고 6개 로직 파일의 장황한 주석을 핵심 위주로 간결화했으며, 배틀 공격자가 2타입일 때의 상성 계산을 곱하기에서 더 유리한 쪽을 택하는 방식으로 바꿔 실제 포켓몬 상성과 더 가깝게 맞췄고, 그 여파로 1타입 포켓몬이 구조적으로 불리해진 것을 배틀 시뮬레이션으로 확인해 "단일 타입 보정" 배율을 추가로 도입했으며, 이 보정이 데미지 멘트 판정에까지 섞여 들어가던 것도 순수 상성 기준으로 분리했고, 상대 포켓몬 이름표-hp바 간격이 내 쪽보다 1px 좁게 보이던 것도 바로잡았고, 배틀 중 교체 후보 목록이 이름이 긴 폼(다이맥스 등)에서 화면 밖으로 삐져나오던 것을 세로 배치로 바꿔 해결했고, 기절 멘트가 쓰러지는 연출보다 먼저 뜨던 순서를 실제 포켓몬 게임과 같은 순서(연출 먼저, 멘트 나중)로 바로잡았으며, 마지막으로 물리/특수 공격을 "공격" 하나로 통합하고 명중률(95%)과 치명타(5%, 2배)를 새로 도입함.

### Version 1.2 — 배틀 시스템 고도화와 폼·스프라이트 데이터 정비 (78~106)

폼별로 타입이 바뀌는 포켓몬이 전부 기본폼 타입으로 고정돼 있던 데이터 버그와, 캐치 게임 CP(종족값) 데이터를 전수 검증해 16개 폼을 바로잡은 뒤 메가/거다이맥스는 "진짜 종족값 저장 + CP 배율은 표시 시점에 적용" 방식으로 개편하고 메가진화 원본 48종 종족값을 공식 값으로 재수정. 배틀은 종족치 기반 데미지 보너스를 도입하고, AI 트레이너의 행동 판단을 조건문 우선순위에서 공격·랭크업·회복·교체 4행동 통합 스코어링(가중 랜덤)으로 전면 개편했으며, 기절 후 강제 교체도 상성·위협도를 반영하도록 수정. 비활성 장식이던 "충전하기" 버튼을 양쪽 파티와 상성을 보여주는 "상태 확인" 오버레이로 바꾸고, 공격 메뉴에 상성 효과 미리보기, 파티 선택 슬롯에 타입 뱃지와 메가/다이맥스 폼 아이콘(도감 폼 칸·상태 확인 화면까지 확장, 판단 로직은 공통 함수로 통일)을 추가. 연출 면에서는 공격자 돌진 + 피격 점멸 모션, 원작 시트를 합성한 랭크업(칼춤)/회복 이펙트를 넣고 이로치 이펙트와 같은 로직으로 통일했으며, 상대 쪽 이펙트가 HP바를 덮던 문제, 애니메이션 도중 스프라이트-hp바 간격이 좁아지던 문제, 이로치 코스프레 피카츄 오프셋이 뒤섞여 있던 문제, 메테노 폼 앞·뒷모습의 외톨이 점 등 스프라이트 데이터 결함을 수정하고 아이콘을 픽셀 유지 방식으로 선명하게 표시. 이어서 앞모습 스프라이트 조회·HP바/기절 연출·필름스트립 재생을 3단계에 걸쳐 공통 함수로 정리하고, 마지막으로 코드 전반 버그 점검에서 배틀 도중 닫은 뒤에도 턴 콜백 연쇄가 새 배틀을 건드리던 누수(세션 번호로 차단), 회복 멘트 조사, 퀴즈 보기 중복을 바로잡음.

### Version 1.3 — 함께하기(로컬 1:1 대전) 멀티플레이 (107~117)

"포켓몬 배틀"을 혼자하기/함께하기로 나누고, 초대 코드(6자리)를 만들고 입력해 1:1로 대전하는 함께하기를 추가. 슬롯 선택창은 두 사람이 모두 선택 완료해야 넘어가고(먼저 누른 쪽은 "대기 중"), 배틀 전 양쪽 스프라이트를 미리 받는 "불러오는 중..." 단계를 거치며, 턴은 양쪽이 모두 행동을 골라야 진행("통신 대기 중...")하고 명중·치명타·선공 같은 랜덤 판정은 방장이 굴려 보내 양쪽 결과가 항상 같게 계산되도록 함. 통신은 처음에 PeerJS(WebRTC P2P)로 구현했으나 테스트 환경에서 연결 실패가 나서, 사용자의 실제 사용 방식(랩탑 한 대에서 같은 브라우저 창 두 개)에 맞춰 서버 없이 창끼리 직접 통신(BroadcastChannel + localStorage)으로 교체했고, 입장은 업계 표준인 3단계 확인(요청·수락·확인)으로 바꿔 입장 취소와 수락이 겹쳐도 한쪽만 선택창에 남는 일이 없게 함. 이어서 안내·오류 멘트를 도감 치트 코드 창과 같은 존댓말로 다듬고 끊김 용어를 포켓몬 본가의 "통신"으로 통일, 대기실 점 애니메이션이 창 크기를 흔들던 문제와 하위 메뉴 뒤로가기 색을 수정, 기절 후 교체 시 "가랏! ~!" 멘트를 넣어 양쪽 화면 타이밍을 맞춤. 다시하기도 양쪽이 모두 눌러야 재대결하도록 바꾸고, 상대가 나갔을 때의 안내를 알림창 대신 버튼·액션박스 문구로 통일(선택창은 1.5초, 승패·배틀 중 끊김은 멘트가 다 보인 뒤 1초 머문 뒤 화면 전환)한 뒤 쓰이지 않게 된 알림창을 삭제함.

## 0. 전체 개요 / 현재 단계

- 시작화면 버튼을 "포켓몬 포획" / "포켓몬 배틀" / "포켓몬 도감" 3개로 분리함(`#start-btn`/`#battle-btn`/`#dex-btn`).
- "포켓몬 배틀"은 아직 **실제 배틀 로직(공격 상성/기술/승패 판정 등)은 없는 프리뷰 단계**. 지금까지 구현된 건:
  - 내가 실제로 잡은 포켓몬 중 하나를 골라 뒷모습으로 등장
  - 야생 포켓몬이 캐치 게임과 동일한 방식으로 등장
  - "공격하기" 버튼으로 야생 포켓몬 hp를 깎는 것(플레이어 쪽은 공격/피격 개념 없음 — 오직 야생 포켓몬만 hp가 있음)
  - hp가 0이 되면 기절 애니메이션 후 다음 야생 포켓몬이 등장(무한 반복, 승패/보상 개념 없음)
- 아직 없는 것(다음 패치 후보): 플레이어 포켓몬 쪽 hp/공격 개념, 실제 기술/데미지 계산, 승패 판정, 대화창(메시지) 시스템, 몬스터볼/도망치기 버튼 실동작.

## 1. 진입 흐름 (버튼 → 선택 모달 → 프리뷰 화면)

- 시작화면 `#battle-btn` 클릭 → `renderBattleList()`로 `#battle-modal` 오픈. 목록은 세션 한정 `capturedList`가 아니라 **영구 저장된 도감 소유 데이터**(`ownedDexForms`/`ownedDexShinyForms`)에서 옴 — 실제로 잡아본 폼만 뜸.
- 포켓몬 한 마리 선택(단일 선택, 예전에 만들었던 "파티(6마리)" 기능은 사용자가 이후 요청으로 **완전히 롤백**돼서 지금은 없음) → "시작하기"(`#battle-start-btn`) → `#battle-preview-screen` 표시.
- 닫기(`#battle-preview-close-btn`)를 누르면 시작화면으로 복귀하며, 배틀 프리뷰 전용으로 덮어썼던 모든 인라인 스타일/클래스를 원상복구함(아래 각 항목 참고 — 캐치 게임 쪽 요소를 그대로 재사용하기 때문에 리셋을 안 하면 다음 실제 포획 게임에 흔적이 남음).

## 2. 뒷모습(내 포켓몬) 스프라이트

- 뒷모습 원본 이미지가 이 프로젝트엔 없어서, 외부 팬게임 `C:\Users\덕문중학교\Downloads\Pokemon Another Red_PWT_250821`(Pokemon Essentials 기반, RPG Maker)의 `Graphics/Pokemon/Back`, `Back shiny` 폴더에서 가져옴.
  - `Data/species.dat`(Ruby Marshal 바이너리)를 직접 파싱하는 파이썬 스크립트를 만들어서 도감번호/메가/거다이맥스 여부를 알아내고, PokeAPI 국가도감(`/pokedex/national`)으로 도감번호 순서를 교차검증한 뒤 파일명을 우리 프로젝트 규칙(`{도감번호}.png`, `{도감번호}-mega.png`, `{도감번호}-gmax.png` 등)에 맞게 복사함.
  - 결과: `images/pokemon/pokemon/back`, `back_shiny`, `back_mega`, `back_mega_shiny`, `back_gmax`, `back_gmax_shiny` 폴더에 정리 완료. 폼 차이(지역폼/코스튬/성별 등)까지는 뒷모습 소스에서 구분이 안 돼서, "일반(normal)" 카테고리는 항상 해당 종의 **기본 폼** 뒷모습으로 대체함(`backSpriteInfo()`가 `category==='normal'`이면 `info.species`로 파일명을 정함). 메가/거다이맥스는 정확한 id로 시도하되 파일이 없으면 `<img onerror>`에서 기본 폼으로 한 번 폴백.
- 재생 로직(`displayBackSprite()`)은 앞모습(`displayMonsterSprite()`)과 동일한 프레임 슬라이싱 방식(스프라이트시트를 `background-position`으로 잘라 재생).
- **하단 정렬**: 뒷모습 소스엔 앞모습용 `SPRITE_OFFSETS` 같은 실측 데이터가 없어서, 이번에 직접 만듦.
  - `back`/`back_shiny`/`back_mega`/`back_mega_shiny`/`back_gmax`/`back_gmax_shiny` 폴더의 **모든 파일**(1025+48+33종×일반/이로치)을 파이썬(Pillow)으로 열어 0번 프레임의 투명 제외 bbox를 측정 → 캔버스 하단부터 그림 최하단 픽셀까지의 여백(px)을 `pokemon_back_sprite_offsets.js`(`BACK_SPRITE_OFFSETS`, `{folder: {fileId: gap}}` 구조)로 저장.
  - `displayBackSprite()`가 이 gap을 표시 배율만큼 환산해서 `translateY`로 내려줌 → 종마다 캔버스 여백이 달라도 그림의 진짜 최하단 픽셀이 항상 `#battle-back-sprite-box` 하단(=액션박스 상단)에 정확히 맞닿음.
- 위치: `#battle-back-sprite-box`는 화면 가로 중앙(`left:50%`), 세로는 액션박스 바로 위(`bottom: calc(15px + var(--action-box-height))`)에 고정. (예전에 "세로 3등분해서 좌측에 배치" 요청이 있었다가 최종적으로 다시 중앙 정렬로 되돌림.)

## 3. 야생 포켓몬(상대) 표시

- 캐치 게임의 `#monster`/`#monster-sprite`/`initGame()`/`displayMonsterSprite()`를 **그대로 재사용**. 배틀 프리뷰 전용 요소를 새로 만들지 않고, 진입 시 `initGame(undefined, alignWildMonsterTopToHpBar)`처럼 두 번째 인자(`onSpriteReady` 콜백)만 추가해서 위치만 배틀 프리뷰용으로 재조정함. 포획 게임 쪽(`initGame()`을 인자 없이 호출)은 전혀 영향 없음.
- **정렬**: `alignWildMonsterTopToHpBar(picked)`(script.js:4212 부근)가 야생 포켓몬 그림의 실제 최상단 픽셀(`SPRITE_OFFSETS[id].h`/`.shinyH` 실측값 기반)이 hp바 하단에 맞닿도록 `monster.style.top`을 인라인으로 계산.
  - 중간에 "프레임(잘리지 않은 정사각형 칸) 기준"으로 바꿔봤는데, 프레임 안 여백이 비대칭인 종(958번 벼리짱 — 프레임 위쪽 절반이 통째로 투명 여백)에서 그림이 hp바에서 한참 떨어져 보이는 문제가 생겨서 **"그림(투명 제외 실제 픽셀) 상단" 기준으로 최종 확정**.
  - `WILD_MONSTER_EXTRA_DROP = 38`(px, 약 1cm/96dpi) 만큼 거기서 추가로 더 내림 — hp바에 완전히 딱 붙어있으면 답답해 보여서 살짝 여유를 준 것(2cm로 했다가 너무 많이 내려간 것 같다고 해서 1cm로 축소).
  - 가로는 화면 중앙(`#monster` 기본 CSS, `left:50%`).
- **샤이니 이펙트 버그 수정**: `#shiny-effect`가 예전엔 `top: calc(var(--monster-top) + var(--monster-size)/2)`라는 정적 CSS 값으로 위치를 잡았는데, 이건 "`#monster`가 항상 기본 위치에 있다"는 전제였음. 배틀 프리뷰에서 `alignWildMonsterTopToHpBar()`가 `#monster`를 인라인으로 재조정하면서 그 전제가 깨져 이로치 이펙트가 엉뚱한 곳에 나타나는 버그가 있었음. → `playShinyEffect()`가 매번 `monster.offsetTop + monster.offsetHeight/2`를 직접 읽어 인라인으로 위치를 계산하도록 수정, CSS의 정적 `top`은 제거. 또한 `initGame()` 안에서 `onSpriteReady`(위치 재조정)를 `playShinyEffect()`보다 **먼저** 실행하도록 순서도 바꿈(안 그러면 이전 라운드의 낡은 위치를 읽어버림).

## 4. hp바 디자인 교체 (배틀 프리뷰 전용)

- 기존 `#monster-info`는 `hp_bar.png`를 배경으로 쓰는 순수 장식(이름/CP 텍스트만 얹는 용도, 실제 게이지 개념 없음) — 포획 게임 쪽은 지금도 그대로 유지.
- 배틀 프리뷰에서만 `overlay_hp_back.png`(138x14, 테두리+"HP" 글자+빈 회색 트랙) + `overlay_hp.png`(96x24, 초록/노랑/빨강 8px 띠 3개가 세로로 쌓인 이미지)로 교체:
  - `#monster-info.battle-hp-style` 클래스: 배경 이미지 교체 + 크기를 `var(--info-width)`의 **80%**로 축소(가로세로 비율 138:14 유지). 이 클래스는 배틀 프리뷰 진입/종료 시에만 추가/제거됨.
  - `#monster-hp-fill`(새 엘리먼트, `#monster-info` 안에 항상 존재하지만 평소엔 `hidden`): `overlay_hp_back.png`에서 실측한 빈 트랙 좌표(원본 138x14 기준 x:32~127, y:2~9)를 퍼센트로 환산해 배치. `background-size:100% 300%` + `background-position`을 `0%/50%/100%`로 옮겨 초록/노랑/빨강 밴드를 고름.
- 색상 기준: **50% 이하 노랑, 25% 이하 빨강** (처음엔 20%였다가, 원본 RPG Maker 게임 로직을 확인하고 25%로 정정 — 아래 5번 참고).
- hp는 `WILD_HP_MAX=100`, 공격 1회당 `WILD_ATTACK_DAMAGE=20`(5방에 기절).
- **공격 버튼**: `#battle-action-box`의 가운데 버튼을 "몬스터볼×1"(비활성) → `#battle-attack-btn` "공격하기"(활성)로 교체. 클릭 시 hp를 20 깎고 `animateWildHp()`로 애니메이션.
- **hp 감소 애니메이션**: `animateWildHp(from, to, onDone)`이 `requestAnimationFrame`으로 선형 보간(`WILD_HP_BAR_CHANGE_TIME = 1000/2 = 500ms`, 몇 칸이 깎이든 항상 이 시간). 진행 중엔 공격 버튼 비활성화(원본의 "while animating_hp? pbUpdate" 블로킹과 동일한 체감). 재생 속도는 "1.5배 빠르게" → "2배 빠르게"로 두 번 조정해서 최종 500ms(원본 1초의 절반).
- hp가 0이 되면 `playWildFaintAnimation()`(6번 항목) 실행 후 `spawnNextBattleWildMonster()`로 다음 야생 포켓몬 등장.

## 5. 원본 게임(RPG Maker, Pokemon Essentials) hp바 로직 리서치

`C:\Users\덕문중학교\Downloads\Pokemon Another Red_PWT_250821\Data\Scripts.rxdata`(Ruby Marshal, zlib 압축)를 직접 압축 해제하는 파이썬 스크립트를 만들어서 전체 스크립트(406개 `.rb`)를 추출 → `Battle_Scene_Objects.rb`에서 실제 hp바 로직 확인:
- `overlay_hp` 비트맵도 우리 것과 동일하게 세로 3등분(초록/노랑/빨강) 구조.
- 폭 = `바 전체폭 * hp/totalhp`, 2px 단위로 스냅.
- 색상 기준: 50% 이하 노랑, **25%(1/4) 이하** 빨강 — 우리가 처음에 20%로 잘못 만들었던 걸 이 리서치 후 25%로 수정.
- `animate_hp`/`update_hp_animation`이 `lerp`로 **1초(HP_BAR_CHANGE_TIME) 동안 선형 보간** — 우리 `animateWildHp()`가 이 로직을 그대로 참고해서 만든 것(지금은 2배속인 0.5초로 조정된 상태).

## 6. 기절(hp 0) 애니메이션

다른 팬게임 `C:\Users\덕문중학교\Downloads\Pokemon-p5js-master`(p5.js 기반)의 `scenes/battle.js`를 분석해서 참고함:
- 원본 메커니즘: `isFainted=true`가 되면 매 프레임 `pokemon.y += 0.8*deltaTime`로 무한정 하강. 페이드아웃은 없음 — 대신 캔버스에 포켓몬을 먼저 그리고 **나중에 하단 UI 패널(대화창 배경)을 덧그리는 순서** 덕분에, 밑으로 내려가다가 그 패널에 가려져 "땅 밑으로 꺼지는" 것처럼 보이는 구조였음(우연한 그리기 순서 트릭이지 명시적 클리핑이 아님).

이 프로젝트는 p5.js 같은 매 프레임 루프가 없는 이벤트 기반 구조라, 아래처럼 재구현함(`playWildFaintAnimation()`, script.js 4289줄 부근). 여러 버전을 거쳐 최종 확정:

1. **1차 시도**: `#monster`에 `.fainted` 클래스로 `translateY` + `opacity:0` 페이드. → "페이드아웃되면서 계속 다 보인다"는 피드백으로 반려(원본은 페이드가 아니라 순수 클리핑이라는 걸 재확인).
2. **2차 시도**: 페이드 제거, `#monster-sprite`만 아래로 `translateY`, `#monster` 박스 자체의 `overflow:hidden`(288px 고정 하단)에서 잘리게 함. 고정 300px/700ms. → "살짝 내려가다 뚝 멈춘다, 땅에 꺼지는 느낌이 안 든다"는 피드백. 원인: 박스 하단 경계가 실제 그림 위치보다 훨씬 아래라, 클리핑이 애니메이션 막바지에만 갑자기 일어남.
3. **최종본**: `clip-path`로 **"지금 이 그림이 서 있는 바로 그 최하단 픽셀 위치"**(`SPRITE_OFFSETS`의 h/shinyH 실측값 기반, `alignWildMonsterTopToHpBar()`와 동일한 계산)에 "땅 라인"을 고정해두고, `#monster-sprite`를 그 아래로 미끄러뜨림 — 발부터 순서대로 땅 밑에 잠기며 사라짐. 이동 거리는 `그림 자신의 실측 세로 길이 + 여유(24px)`만큼만(`WILD_FAINT_CLEAR_BUFFER`), 속도는 `WILD_FAINT_SPEED=0.5px/ms` 고정이라 거리에 비례해 시간이 자동으로 정해짐(`WILD_FAINT_MIN_DURATION=300`~`WILD_FAINT_MAX_DURATION=900`ms로 clamp).
4. **정리 타이밍 버그 수정**: 처음엔 가라앉기가 끝나자마자 `transform`/`clip-path`를 즉시 원상복구했는데, 그 직후 `spawnNextBattleWildMonster()`가 시작하는 `opacity` 페이드아웃이 `#monster`의 기본 `transition:opacity 0.4s`를 타면서, "원위치로 되돌려진(=서 있는) 몬스터가 0.4초 동안 보였다가 사라지는" 것처럼 보임(사용자 표현: "갑자기 솟아올랐다가 사라진다"). → 가라앉은 채로 그대로 두고, `spawnNextBattleWildMonster()` 안에서 새 몬스터를 실제로 그리기 **직전**(이미 opacity 0이라 화면에 안 보이는 타이밍)에만 `transition`/`clip-path`를 정리하도록 수정. 이후 정상 확인 완료.

## 7. 주요 파일 변경 요약

- **`index.html`**: 시작화면 버튼 3분리, `#battle-modal`/`#battle-preview-screen`(뒷모습 박스+액션박스) 추가, `#monster-info` 안에 `#monster-hp-fill` 추가, `#battle-attack-btn` 추가, `overlay_hp_back.png`/`overlay_hp.png` preload 추가.
- **`style.css`**: `#battle-back-sprite-box`/`#battle-back-sprite`/`#battle-action-box` 등 배틀 프리뷰 전용 레이아웃, `#monster-info.battle-hp-style`/`#monster-hp-fill`(새 hp바 디자인), `#shiny-effect`의 정적 `top` 제거.
- **`script.js`**: `BACK_FOLDER`/`backSpriteInfo`/`baseBackSpriteInfo`/`displayBackSprite`/`stopBackSpriteAnimation`(뒷모습), `alignWildMonsterTopToHpBar`(야생 포켓몬 위치), `updateWildHpFillDisplay`/`animateWildHp`/`resetWildHp`/`playWildFaintAnimation`/`spawnNextBattleWildMonster`(hp/공격/기절/다음 몬스터), `renderBattleList`/선택·시작·닫기 핸들러(배틀 모달·프리뷰 흐름), `playShinyEffect` 위치 계산 방식 변경.
- **`pokemon_back_sprite_offsets.js`**(신규): 뒷모습 6개 폴더 전체 실측 하단 여백 데이터(`BACK_SPRITE_OFFSETS`).
- **`images/pokemon/pokemon/back*`**(신규 폴더 6개): 외부 팬게임에서 가져온 뒷모습 스프라이트.

## 8. 완전히 롤백되어 지금은 없는 것 (혼동 방지용 기록)

- 포획한 포켓몬 6마리 파티 시스템(꽉 차면 방출하고 교체) — 만들었다가 전체 롤백됨.
- `overlay_hp_back.png` 기반의 "뒷모습 우측/야생 앞모습 좌측에 각각 새 hp바" 듀얼 배치 디자인 — 만들었다가 전체 롤백됨(이후 다시 요청받아 **지금 있는 hp바 디자인**을 새로 만든 것과는 별개 시도였음).
- 배틀 뒷모습/야생 포켓몬을 "화면 세로 3등분 좌/우 배치" — 롤백되어 지금은 둘 다 가로 중앙 정렬.

## 9. 사후 버그 수정: 실제 포획 게임의 몬스터볼 튕기는 높이/위치가 틀어지던 문제

패치를 마무리한 뒤 "포켓몬 캐치 쪽은 안 건드렸어야 하는데 몬스터볼 튕기는 높이/위치가 틀어졌다"는 리포트로 발견/수정함.

- **원인**: 실제 포획 게임의 몬스터볼 목표 지점(`getThrowTargetBottom()`, script.js)은 CSS 고정값이 아니라 **`#monster`의 실시간 렌더링 위치**(`getBoundingClientRect()`)를 읽어서 계산함. 배틀 프리뷰의 `spawnNextBattleWildMonster()`(기절 후 다음 포켓몬 등장, `setTimeout`+이미지 로딩 등 비동기)와 `alignWildMonsterTopToHpBar()`(hp바에 위치 맞추기)가 끝나기 전에 사용자가 ×(닫기)로 나가버리면, 그 비동기 콜백을 취소하는 로직이 없어서 **닫은 뒤에도 뒤늦게 실행되며 이미 실제 포획 게임 용도로 쓰이는 `#monster`의 위치/그림/이름표를 다시 건드림** — 그 잘못된 위치를 기준으로 몬스터볼이 튕기는 높이가 계산돼서 증상이 나타남.
- **수정**: `battlePreviewActive` 플래그(script.js, `selectedBattleId` 근처에 선언) 추가. `battleStartBtn` 클릭 시 `true`, `battlePreviewCloseBtn` 클릭 시(맨 먼저) `false`로 설정. `alignWildMonsterTopToHpBar()`와 `spawnNextBattleWildMonster()`(진입부 + `Promise.all(...).then()` 콜백 내부 두 군데) 각각에서 이 플래그가 꺼져 있으면 즉시 `return`하도록 가드 추가.
- **교훈**: `#monster`/`#monster-info` 등 캐치 게임과 배틀 프리뷰가 공유하는 요소를 건드리는 비동기 콜백(setTimeout/이미지 로딩/requestAnimationFrame)은 반드시 "지금도 그 화면이 열려 있는가"를 실행 시점에 다시 확인해야 함 — 동기 코드에서 나갈 때 리셋하는 것만으로는 부족함(이미 예약된 콜백은 그 리셋과 무관하게 나중에 실행됨). `animateWildHp()`의 `requestAnimationFrame`은 애초에 `wildHpAnimId`로 핸들을 저장해 `cancelAnimationFrame`으로 확실히 취소하고 있었어서 이 버그가 없었음 — 앞으로 유사한 비동기 연출을 추가할 때는 이 두 패턴(취소 가능한 핸들 저장 또는 활성 플래그 체크) 중 하나를 반드시 적용할 것.

## 10. 결과 화면에 "처음으로" 버튼 추가

시간이 다 되거나 일시정지 화면에서 "그만하기"를 눌러 나오는 결과 화면(`#result-screen`)의 "다시하기" 버튼 위에 "처음으로"(`#result-home-btn`) 버튼을 추가함. 클릭하면 `#result-screen`을 숨기고 `#start-screen`(포켓몬 포획/포켓몬 배틀/포켓몬 도감)을 다시 보여줌. `showResultScreen()`이 이미 몬스터/포켓볼/컨트롤패널/타이머를 전부 정리해둔 상태라 추가 리셋 없이 화면 전환만 하면 됨.

## 11. 대각선 배치 + 내 포켓몬용 hp바 추가

실제 포켓몬 게임처럼 상대는 우측 상단(스프라이트)/좌측 상단(hp바+이름), 나는 좌측 하단(뒷모습)/우측 하단(hp바+이름)으로 대각선 배치하도록 재구성함. 액션박스(공격하기 버튼)는 이번 요청 범위 밖이라 하단 중앙에 그대로 유지.

- **야생 포켓몬**(`#monster`): `.battle-side-right` 클래스로 화면 중앙에서 +35px 오른쪽 이동. **야생 hp바+이름표**(`#monster-info`/`#monster-info-text`): `.battle-side-left` 클래스로 왼쪽 고정 마진(8px)으로 이동, `transform`도 함께 해제(원래 가운데 정렬용이었음). 둘 다 배틀 프리뷰 진입/종료 시에만 토글, 포획 게임 쪽엔 영향 없음.
- **뒷모습**(`#battle-back-sprite-box`): 배틀 프리뷰 전용 요소라 클래스 토글 없이 기본 위치 자체를 중앙에서 -35px(왼쪽)로 변경.
- **신규**: 내 포켓몬(뒷모습)용 hp바+이름/CP 태그(`#battle-back-info`+`#battle-back-hp-fill`+`#battle-back-info-text`). 야생 쪽과 동일한 이미지(`overlay_hp_back.png`/`overlay_hp.png`)를 재사용하지만, 아직 내 포켓몬이 데미지를 받는 기능이 없어서 **hp는 항상 100%(초록 풀피)로 고정** — CSS에 고정값으로 박아둠(JS 갱신 없음). 이름/CP 텍스트만 `battleStartBtn` 핸들러에서 선택한 포켓몬 정보(`POKEMON_DATA`)로 채움. 위치는 야생 쪽 hp바가 화면 맨 위(36px)에 있는 것과 대칭되게, 뒷모습 박스 위쪽에 같은 36px 여백을 두고 배치.
- **같이 고친 것**: `#shiny-effect`(이로치 이펙트)가 세로는 이미 `#monster`를 따라가게 돼 있었는데 가로는 여전히 화면 중앙 고정이었음 — 야생 포켓몬이 오른쪽으로 이동하면서 이 문제가 다시 드러나서, `playShinyEffect()`가 `monster.offsetLeft + offsetWidth/2`도 같이 계산해서 가로도 따라가게 수정(CSS의 정적 `left:50%`는 제거).

## 12. hp바는 고정, 스프라이트를 에셋 크기 기준으로 재배치 + 이름표는 항상 hp바 위

대각선 배치(11)의 좌우 이동값이 전부 고정 35px이라 덩치 큰 종은 hp바와 겹치고 작은 종은 과하게 벌어지는 문제가 있어서 수정함. 실제 포켓몬 게임처럼 **hp바는 항상 고정 모서리에 두고, 스프라이트 쪽이 자기 실측 크기만큼 hp바를 피해서 위치를 잡도록** 바꿈.

- **`pokemon_back_sprite_offsets.js` 데이터 형식 변경**: 기존엔 종마다 `gap`(하단 여백) 숫자 하나만 저장했는데, 여기에 `w`(그림 실측 가로폭)도 같이 저장하도록 확장(`{folder:{fileId: gap}}` → `{folder:{fileId: {g, w}}}`, Pillow 스크립트로 전체 재실측). `displayBackSprite()`의 읽는 부분도 `.g`/`.w`로 갱신.
- **야생 포켓몬**(`alignWildMonsterTopToHpBar()`): 고정 `.battle-side-right`(35px) 클래스 제거, 대신 `SPRITE_OFFSETS[id].w`/`.shinyW` 실측값으로 "지금 화면에 보이는 그림 폭"을 계산해서, 야생 hp바(`monsterInfo`) 오른쪽 끝에서 최소 10px(`BATTLE_SPRITE_MIN_HP_GAP`) 떨어지도록 `monster.style.left`를 인라인으로 역산(화면 중앙 미만으로는 안 가고, 화면 오른쪽 가장자리 6px 여백 `BATTLE_SPRITE_EDGE_MARGIN` 안에서 clamp).
- **뒷모습**(`displayBackSprite()`): 위와 좌우 대칭으로 동일한 계산 — 새로 실측한 `w`로 그림 폭을 구해서, 신규 `#battle-back-info`(내 hp바) 왼쪽 끝에서 최소 10px 떨어지도록 `battleBackSpriteBoxEl.style.left`를 역산.
- **이름/CP 태그는 항상 hp바 위**: 야생 쪽(`#monster-info-text`)은 원래부터 hp바 위였음(수정 불필요). 뒷모습 쪽(`#battle-back-info-text`)은 hp바 **아래**에 있던 걸 **위**(줄높이 20px+3px 여백)로 옮김.
- 두 함수 모두 계산에 쓰는 hp바의 실제 위치를 `offsetLeft`/`offsetWidth`로 직접 읽음(CSS 변수로 재계산 안 함) — 세로 정렬(`alignWildMonsterTopToHpBar`의 `hpBarBottom` 계산)과 동일한 패턴.
- `battlePreviewCloseBtn`에서 `monster.style.left`/`battleBackSpriteBoxEl.style.left`도 리셋 추가.

## 13. 내 포켓몬 hp바/이름표를 액션박스 위로 재배치 (야생 스프라이트와 겹침 수정)

11/12에서 만든 내 포켓몬용 hp바(`#battle-back-info`/`#battle-back-info-text`)가 화면 위쪽(야생 hp바와 대칭되는 자리)에 있었는데, 계산해보니 그 자리가 **야생 포켓몬 그림이 실제로 닿을 수 있는 범위(y≈91~379, 덩치 큰 종일수록 더 내려옴) 안**이라 큰 종을 만나면 겹치는 문제가 있었음. 야생 쪽 hp바(화면 맨 위)는 반대로 내 뒷모습 포켓몬이 아무리 커도 안 닿는 안전한 자리라 문제없었음 — 내 쪽만 위치가 안 맞았던 것.

**수정**: `#battle-back-info`/`#battle-back-info-text`를 `top` 기준(화면 위쪽 대칭 시도) 대신 **액션박스 바로 위(15px 여백)**로 재배치(`bottom: calc(15px + var(--action-box-height) + 15px)`). 이 자리는 야생 포켓몬 최악의 경우(하단 y≈379)보다 한참 아래고, 내 뒷모습 포켓몬 최악의 경우(상단 y≈230)보다도 한참 아래라 양쪽 다 안 겹치는 안전지대.

**샤이니 이펙트**도 같이 확인함 — 이미 `playShinyEffect()`가 매번 `monster.offsetLeft/offsetTop`을 실시간으로 읽어 계산하고(`script.js:3594-3595`), `initGame()`/`spawnNextBattleWildMonster()` 둘 다 위치 확정(`alignWildMonsterTopToHpBar`)을 먼저 하고 이펙트를 나중에 재생하는 순서가 이미 맞게 돼 있어서 별도 수정 불필요(11에서 이미 처리됨).

## 14. 내 hp바를 액션박스 위 고정에서 "뒷모습 그림 위쪽 끝" 동적 추적으로 재수정

13에서 액션박스 바로 위(고정 위치)로 옮겼더니, 이번엔 **내 hp바가 내 뒷모습 포켓몬 자신의 그림과** 겹치는 문제가 생김. 원인 재분석: 뒷모습은 항상 액션박스에 발이 닿은 채(bottom:0 고정) 종마다 다른 높이로 위로 자라나는 구조라서, 화면 위/아래 어디에 hp바를 고정으로 박아놔도 그 자리를 지나가는 크기의 종이 반드시 나옴 — 고정 위치로는 근본적으로 해결이 안 됨(13은 "야생 쪽과 안 겹침"만 확인하고 "내 그림과 안 겹침"은 잘못 계산했었음).

**최종 수정**: `#battle-back-info`/`#battle-back-info-text`의 위치를 CSS 고정값에서 다시 `displayBackSprite()`(script.js)가 그때그때 계산하는 인라인 값으로 바꿈 — 이 그림의 "잘리지 않은 프레임"(투명 여백 포함 정사각형 칸, `displaySize`) 위쪽 끝(`boxEl.offsetTop + (boxHeight - displaySize)`)을 구해서, 그 바로 위(최소 여백 `BATTLE_SPRITE_MIN_HP_GAP`)에 hp바+이름표를 배치. 내용물 자체 높이는 실측해두지 않았지만 "프레임"을 기준 삼으면 그림이 프레임 밖으로 나갈 일이 없어 항상 안전. 너무 작은 종에서 hp바가 과하게 아래로 안 붙게, 그리고 너무 큰 종에서 야생 쪽 영역까지 안 올라가게 `MIN_INFO_TOP=60px`로 하한선 clamp. `battlePreviewCloseBtn`에서 `battleBackInfoEl`/`battleBackInfoTextEl`의 `style.top`도 리셋 추가.

이걸로 야생 쪽(hp바 고정 + 스프라이트가 실측 폭만큼 피함)과 뒷모습 쪽(스프라이트는 가로만 고정 hp바를 피하고, hp바 자체가 세로로 스프라이트를 피함) 두 방식이 서로 다른 게 됐는데 — 뒷모습은 애초에 세로 크기 편차가 훨씬 크고(발이 액션박스에 고정된 채 위로만 자람) 고정 위치가 통하지 않는 구조라 불가피한 비대칭. 실제 동작(안 겹침)이 중요하지 두 로직이 대칭일 필요는 없음.

## 15. 배치를 원본 게임 방식(고정 앵커 + 계산 없음)으로 단순화

11~14에서 "그림 실측 크기 기준으로 매번 간격 계산"하는 방식을 계속 다듬었지만, 종마다 간격이 달라지거나(리자드 vs 바리톱스) 자꾸 다른 대상과 새로 겹치는 문제가 반복됐음. 원본(Pokemon Essentials) 코드를 직접 열어본 결과, **원본은 hp바와 스프라이트 크기/위치를 아예 서로 무관하게 그린다**는 걸 확인함:
- hp박스: `PLAYER_BASE_X/Y`, `FOE_BASE_X/Y` 같은 화면 기준 고정 좌표 — 스프라이트를 절대 참조 안 함.
- 스프라이트: 확대/축소 없이 원본 픽셀 그대로, 원점(origin)을 항상 "가로 중앙+세로 맨 아래(발밑)"로 잡아서(`pbSetOrigin`) 그 지점을 고정 좌표에 맞춤 — 큰 종은 위로 크게 자라고 작은 종은 조금만 자람. hp바를 피하려는 실시간 계산 자체가 없음.

**우리 화면(370x600)에서 계산해보니**: 야생 스프라이트는 `y≈91`부터 아래로만(최대 `y≈379`), 뒷모습 스프라이트는 `y≈518.5`(액션박스)부터 위로만(최대 `y≈230.5`) 자람 — 두 스프라이트 다 절대 침범하지 않는 유일한 구간은 **화면 맨 위(`y<91`)** 뿐. 야생 hp바가 이미 그 자리(`--info-top:36px`)에 있었으니, **내 hp바도 같은 자리(화면 맨 위, 반대쪽)로 옮기면 이론상 100% 안 겹침**. hp바가 전부 안전지대로 빠지고 나면 스프라이트는 더 이상 hp바를 피할 계산이 필요 없어져서, 원본처럼 고정 오프셋(±40px)만 주면 됨.

**적용**:
- `#battle-back-info`/`#battle-back-info-text`: 14의 동적(JS) 위치 계산을 버리고 `#monster-info`/`#monster-info-text`와 완전히 대칭인 고정 CSS 값(화면 맨 위, 반대쪽)으로 되돌림.
- `#monster`: `.battle-side-right { left: calc(50% + 40px); }` 클래스 복원(12에서 지웠던 것, 값만 40px).
- `#battle-back-sprite-box`: `left: calc(50% - 40px)` 고정값으로 되돌림.
- `alignWildMonsterTopToHpBar()`/`displayBackSprite()`: 그림 실측 폭(w) 기반 가로 위치 계산, 14의 세로 위치 계산(뒷모습 hp바 쪽) 전부 제거. 세로 "hp바에 맞닿기"(`WILD_MONSTER_EXTRA_DROP`, 뒷모습 `g` 여백 보정)만 유지 — 이건 우리 소스 이미지 자체의 투명 여백이 원본보다 들쑥날쑥해서 계속 필요함.
- `BACK_SPRITE_OFFSETS`의 `w`(가로폭) 필드는 이제 안 써서 다시 `g`(세로 여백)만 저장하는 원래 형식으로 되돌려 재생성.
- `BATTLE_SPRITE_MIN_HP_GAP`/`BATTLE_SPRITE_EDGE_MARGIN`/`MIN_INFO_TOP` 등 계산용 상수 전부 제거.

**남은 한계**: 가로는 화면이 좁아서(370px에 288px짜리 스프라이트 2개) 완전한 비겹침을 보장 못 함 — 야생/뒷모습 스프라이트끼리 서로 크게 겹칠 수 있음(둘 다 hp바와는 안 겹침, 서로끼리는 안 다룸). 원본도 똑같이 "웬만하면 안 겹치는 고정값" 수준이라 이 정도 타협은 원본 철학과도 일치.

## 16. hp바+이름표를 "자기 스프라이트 발밑에 닿게" 재배치(대각선 배치 폐기)

15의 "hp바는 화면 맨 위 고정, 스프라이트는 고정 오프셋" 대각선 배치를 사용자가 다시 바꿈 — 이번엔 **야생/내 포켓몬 둘 다 hp바+이름표가 자기 스프라이트의 애니메이션 하단(발밑)에 닿도록**, 액션박스와는 안 겹치는 선에서 전체 위치를 다시 조정.

**야생 쪽**: `alignWildMonsterTopToHpBar()` → `alignWildMonsterToGround()`로 이름/방식 변경 — "그림 상단이 hp바에 닿기"(top-anchor)에서 "그림 하단이 고정 지점(`WILD_SPRITE_GROUND_Y=240px`, #game-container 상단 기준)에 닿고 위로 자라기"(bottom-anchor, 원본 게임과 동일한 방향)로 전환. hp바+이름표(`#monster-info`/`#monster-info-text`)는 이제 CSS 클래스가 아니라 `battleStartBtn`에서 인라인 `style.left/top`으로 한 번만 고정 배치(`WILD_SPRITE_GROUND_Y` + `WILD_INFO_NAME_BLOCK_HEIGHT=23`px 두 상수만으로 계산되는 고정값이라 종별 계산 불필요) — 스프라이트와 같은 가로 위치(오른쪽 +40px)에 두고, 이름표 상단이 스프라이트 발밑에 닿고 그 아래에 hp바가 옴.

**내 쪽**: `#battle-back-sprite-box`/`#battle-back-info`/`#battle-back-info-text`를 액션박스 위에 아래→위 순서로 쌓음: 액션박스 → 15px 여백 → hp바 → 3px 여백 → 이름표 → (닿음) → 뒷모습 스프라이트. 전부 같은 가로 위치(왼쪽 -40px)로 통일. 뒷모습 스프라이트의 `bottom`이 기존(액션박스에 직접 맞닿음)보다 hp바+이름표 높이만큼(약 55px) 위로 올라감 — `displayBackSprite()`의 하단 여백 보정(`g` 값 기반 `translateY`) 로직은 그대로 유지(박스 자체의 화면상 위치가 바뀌어도 "박스 안에서 그림 하단이 박스 하단에 닿기"는 동일하게 작동).

**정리한 것**: `.battle-side-left` CSS 클래스(11에서 만든 hp바 왼쪽 고정 마진용) 제거, `WILD_MONSTER_EXTRA_DROP` 상수 제거, 안 쓰는 `battleBackInfoEl`/`battleBackInfoTextEl` JS 참조 제거.

**한계(15와 동일하게 유지)**: 화면이 좁아 스프라이트끼리(야생 vs 뒷모습) 서로 겹칠 수 있음 — 이번 변경도 "액션박스와 안 겹침"만 보장하고 상대 스프라이트와의 겹침까지는 다루지 않음(사용자가 명시적으로 액션박스만 언급).

## 17. 야생 포켓몬을 다시 우측 "상단"으로(내 포켓몬과 비례하는 위/아래 뒤집힌 구조)

16에서 야생 포켓몬을 화면 중간(`WILD_SPRITE_GROUND_Y=240`)에 두고 위로 자라게 했는데, "다시 우측 상단으로, 내 포켓몬 위치와 비례하게" 옮겨달라는 요청으로 재조정함.

내 포켓몬 쪽 구조: `[액션박스] -15px- [hp바] -3px- [이름표] -(닿음)- [스프라이트, 위로 자람]`. 이걸 "이름표는 항상 hp바 위" 규칙을 유지한 채 위아래로 뒤집으면 순서가 그대로 대칭이 아니라 **바뀜** — 화면 위쪽에 가까운 요소가 이름표여야 규칙이 유지되므로: `[화면 상단] -15px- [이름표] -3px- [hp바] -(닿음)- [스프라이트, 아래로 자람]`.

- `alignWildMonsterToGround()`(16에서 만듦) → 다시 `alignWildMonsterTopToHpBar()`로 이름/로직 복원: 그림 상단이 hp바 하단에 바로 닿도록(추가 여백 없이) 계산.
- `WILD_SPRITE_GROUND_Y`(240) → `WILD_INFO_TOP`(15)로 교체 — 이름표 상단을 화면 맨 위에서 15px(내 쪽 액션박스-hp바 여백 15px과 대응)에 고정.
- `battleStartBtn`에서 `monsterInfoText`/`monsterInfo`의 인라인 top을 `WILD_INFO_TOP`/`WILD_INFO_TOP+WILD_INFO_NAME_BLOCK_HEIGHT`로 재설정.
- 결과: 야생 정보블록(이름표+hp바, y≈15~55)은 내 포켓몬의 최대 도달 범위(y≈176 이상)보다 항상 위에 있어서 내 포켓몬과는 절대 안 겹치고, 내 정보블록(y≈464~504)도 야생 포켓몬 최대 도달 범위(최대 y≈343)보다 항상 아래라 안 겹침 — 이번에도 hp바/이름표는 반대편 스프라이트와 안 겹침이 보장됨(스프라이트끼리 겹치는 건 여전히 범위 밖).

## 18. 정보블록↔스프라이트 사이 5px 간격 확보

16/17에서 hp바+이름표가 스프라이트에 완전히 "닿도록"(0 간격) 만들었는데, 답답해 보여서 5px 여백을 두기로 함. "정보블록을 옮긴다"는 요청이지만, 스프라이트 위치 계산 방식이 두 쪽이 서로 달라서 구현도 다르게 처리함:

- **내 쪽(뒷모습)**: `#battle-back-sprite-box`는 순수 고정 CSS 값(스프라이트 위치가 hp바를 실시간으로 참조하지 않음)이라, `#battle-back-info`/`#battle-back-info-text`의 `bottom` 계산에서 액션박스-hp바 간 여백을 15px→10px로만 줄여서(스프라이트 쪽 계산식은 그대로 둠) 그 사이에 자연스럽게 5px 틈이 생기게 함.
- **야생 쪽**: `alignWildMonsterTopToHpBar()`가 `monsterInfo.offsetTop`(hp바의 지금 실제 위치)을 실시간으로 읽어서 스프라이트를 거기에 맞춰 계산하기 때문에, 단순히 hp바 위치만 옮기면 스프라이트가 따라와서 간격이 다시 0이 돼버림. 그래서 `WILD_INFO_GAP=5` 상수를 추가하고, 스프라이트 계산은 "hp바가 원래(간격 확보 전) 있었을 자리"(`WILD_INFO_TOP + WILD_INFO_NAME_BLOCK_HEIGHT + 실제 hp바 높이`, 위치 이동과 무관한 상수 기반 계산)를 그대로 기준으로 삼도록 바꾸고, `battleStartBtn`에서 `monsterInfo`/`monsterInfoText`의 실제 인라인 위치만 `WILD_INFO_GAP`만큼 위로 옮김.

## 19. 샤이니 이펙트 가로 위치 버그 수정(오른쪽으로 절반 폭만큼 벗어남)

`playShinyEffect()`가 `shinyEffect.style.left = monster.offsetLeft + monster.offsetWidth/2`로 계산했는데, 세로(`offsetTop + offsetHeight/2`)와 같은 패턴을 가로에도 그대로 복사한 게 원인. `#monster`는 `left:50%` + `transform:translateX(-50%)`(그 좌표 자체가 이미 중심이 되는 CSS 중앙정렬 트릭)를 쓰는데, Y축엔 이런 이동 transform이 없어서 `offsetTop`은 진짜 "윗변" 좌표라 `+offsetHeight/2`가 필요하지만, X축은 `offsetLeft` 자체가 이미 `transform` 반영 전 좌표=박스의 실제 렌더링 중심이라 `+offsetWidth/2`를 또 더하면 절반 폭(144px)만큼 오른쪽으로 벗어나 버림. `shinyEffect.style.left = monster.offsetLeft`로 수정(offsetWidth/2 제거).

## 20. 내 포켓몬(뒷모습)에도 샤이니 이펙트 추가

지금까지 샤이니 반짝이 이펙트(`#shiny-effect`)는 야생 포켓몬 전용이었음 — 내가 이로치 포켓몬을 선택해서 뒷모습으로 등장시켜도 반짝임이 없었음. `playShinyEffect()`와 완전히 같은 방식으로 뒷모습용을 하나 더 만듦.

- 신규 `#battle-back-shiny-effect` 요소 + CSS(디자인은 `#shiny-effect`와 동일, 위치는 JS가 매번 지정).
- `playBackShinyEffect(boxEl, displaySize)`(script.js) — `playShinyEffect()`의 뒷모습판. **크기**는 야생 쪽처럼 `SPRITE_OFFSETS[id].shinyH`(실측 내용물 높이)를 쓸 수 없음(뒷모습은 `BACK_SPRITE_OFFSETS`에 하단 여백만 있고 내용물 높이를 따로 안 재둠) — 그래서 "잘리지 않은 프레임" 크기(`displaySize`)를 그대로 씀(실제 그림보다 살짝 크게 나올 수 있는 근사치, 뒷모습 실측 데이터 부재라는 기존 한계와 같은 선상).
- **위치**는 19에서 고친 것과 동일한 공식 사용(`#battle-back-sprite-box`도 `#monster`와 똑같이 `left:X%`+`transform:translateX(-50%)`만 걸려있어서 `offsetLeft`가 이미 중심, `offsetTop+offsetHeight/2`로 세로 중심) — 이번엔 처음부터 올바른 공식으로 작성해서 같은 버그를 반복하지 않음.
- `displayBackSprite()`의 `isShiny`가 true일 때만 호출, 시작할 때 `stopBackShinyAnimation()`으로 이전 재생 정리, `battlePreviewCloseBtn`에서도 정리.

## 21. 뒷모습도 앞모습과 동일한 x/y/w/h 실측 데이터로 정중앙 보정 + 샤이니 크기 정확화

"내 포켓몬 샤이니도 정중앙을 타겟했으면 좋겠다"는 요청으로, 뒷모습(back) 스프라이트도 앞모습 `SPRITE_OFFSETS`와 완전히 동일한 형식의 실측 데이터를 새로 만듦.

- **데이터**: `BACK_SPRITE_OFFSETS`를 `{folder: {fileId: gap}}`(세로 여백 하나)에서 `{folder: {fileId: {x, y, w, h}}}`로 전면 재생성(Pillow로 6개 폴더 전체 재실측, x/y는 앞모습과 동일한 "프레임 중심 - 그림 중심" 규칙).
- **`displayBackSprite()` 재작성**: 기존엔 그림을 박스 하단에 고정(`bottom:0`)해두고 세로 여백만 보정하는 방식이었는데, 이제 `displayMonsterSprite()`와 완전히 동일하게 **그림을 박스 정중앙에 오도록 x/y로 보정**(가로도 처음으로 보정됨 — 기존엔 가로 보정이 아예 없었음)하고, 대신 **바깥 박스(`#battle-back-sprite-box`) 자체의 위치**를 그림의 실측 높이(`h`)로 역산해서 "그림 하단이 hp바+이름표에 정확히 닿도록" 맞춤(`alignWildMonsterTopToHpBar()`와 완전히 대칭인 방식). `#battle-back-sprite-box`의 `bottom` 고정 CSS는 JS가 `top`을 인라인으로 설정하면 자동으로 무시되므로(height가 고정값이라 top+height+bottom 과잉 지정 시 bottom이 무시되는 CSS 표준 동작) 그대로 둬도 안전함.
- **`playBackShinyEffect()`**: 이제 실측 `h`(그림 실제 세로 길이) × 배율로 정확한 크기를 계산 — 예전엔 "잘리지 않은 프레임" 크기를 그대로 썼어서 종에 따라 그림보다 훨씬 크게 나올 수 있었음. 위치(박스 중심)는 그림 중심과 항상 일치하도록 보정됐으니 그대로 둬도 정확함.
- `BACK_INFO_GAP=5`(px) 상수로 18에서 확보한 "그림↔정보블록 5px 간격"을 새 계산 방식에서도 유지.
- **참고**: "나갔다가 다시 들어오면 샤이니가 재생 안 됨" 리포트가 있었는데, 정적 코드 분석으로는 명확한 원인을 못 찾음 — 이번에 관련 로직(`displayBackSprite`/`playBackShinyEffect`)을 통째로 다시 작성했으니 같이 없어졌을 가능성이 있음. 재발하면 다시 확인 필요.

## 22. 포켓몬 타입 데이터 추가 + 배틀 화면에서 CP 대신 타입 뱃지 표시

**타입 데이터**: 원본 게임(`Pokemon Another Red_PWT_250821`)의 `species.dat`(`@types`)를 실측해서 `pokemon_data.js`의 1591개 항목 전체에 `"types": ["FIRE", "FLYING"]` 같은 필드를 추가함(전부 해석 성공, 미해결 0건). `normal` 카테고리는 기본 폼(species) 기준, `mega`/`gmax`는 그 폼 자체의 정확한 타입을 반영(예: 리자몽메가X는 불꽃/드래곤으로 기본형과 다름) — 뒷모습 폴백과 같은 수준의 근사(폼 차이는 기본 폼과 동일 처리).
- 매칭은 이전 뒷모습 추출 때 만든 도감번호/메가/거다이맥스 심볼 매칭 로직을 그대로 재사용(같은 `species.dat`, 같은 후보 매칭 규칙).
- 타입 아이콘 순서는 `types.dat`(`GameData::Type#icon_position`)에서 그대로 실측: 노말/격투/비행/독/땅/바위/벌레/고스트/강철/???(QMARKS)/불꽃/물/풀/전기/에스퍼/얼음/드래곤/악/페어리/스텔라(0~19) — 사용자가 준 `images/pokemon/layout/types.png`(64x560, 세로 20칸)의 배치 순서와 정확히 일치.

**배틀 화면 UI**: 야생(`#monster-info-text`)과 내 포켓몬(`#battle-back-info-text`) 둘 다 이름 옆에 CP 대신 타입 뱃지를 1열로 붙여서 보여줌.
- `renderTypeBadges(container, types)`(script.js) — types 배열 길이만큼 `.type-badge`(48x21px, `types.png`를 절반(32x14)으로 다운스케일한 뒤 다시 1.5배 키운 크기 — 처음엔 32x14로 만들었다가 사용자 요청으로 1.5배 확대함) 스팬을 만들어 넣는 공용 함수. 크기를 바꿀 땐 `style.css`의 `.type-badge`(width/height/background-size)와 `script.js`의 `TYPE_BADGE_HEIGHT` 둘 다 같이 맞춰야 함.
- **야생 쪽**: `#monster-bst`(CP)는 실제 포획 게임에서 계속 필요해서 못 지움 — `updateMonsterInfo()`에 `battlePreviewActive` 분기를 추가해서, 배틀 프리뷰일 때만 `#monster-bst`를 숨기고 `#monster-types`(신규)를 채워서 보여줌. 포획 게임(플래그 false)에서는 그대로 CP 표시.
- **내 쪽**: `#battle-back-info-text`는 배틀 프리뷰 전용이라 `#battle-back-bst`(CP 스팬)를 완전히 제거하고 `#battle-back-types`로 교체 — `battleStartBtn`에서 `renderTypeBadges()` 호출로 채움.

## 23. 배틀 화면 이름표 다듬기 (콜론 제거, 포획완료 아이콘 숨김)

- 이름 옆 콜론(`:`) 제거 — 콜론은 원래 뒤에 "CP 값"이 붙는 걸 전제로 한 표기였는데, 이제 타입 뱃지가 붙어서 안 맞음. `updateMonsterInfo()`에서 `battlePreviewActive`일 때만 콜론 없이 이름만 출력, 포획 게임은 그대로 유지. `battleBackNameEl`(내 포켓몬)은 애초에 배틀 전용이라 무조건 콜론 없이.
- `#monster-owned-badge`(포획 완료 표시 몬스터볼 아이콘)도 배틀 프리뷰에서는 무조건 숨김 — 어차피 배틀 상대는 항상 "이미 잡은 포켓몬 중에서 고르는" 화면이라 표시할 의미가 없음(`monsterOwnedBadgeEl.classList.toggle('hidden', battlePreviewActive || !alreadyOwnedExact)`). 포획 게임 쪽은 원래대로 동작.

## 24. 이름/타입 태그 정렬을 hp바 중심 → 좌우 끝 기준으로 변경

- 내 포켓몬(뒷모습) 이름+타입 뱃지 줄(`#battle-back-info-text`)은 hp바(`#battle-back-info`)의 **왼쪽 끝**에 맞춰 정렬, 상대(야생) 포켓몬 쪽(`#monster-info-text`)은 hp바(`#monster-info`)의 **오른쪽 끝**에 맞춰 정렬. 이전엔 둘 다 각자 hp바와 같은 중심점(`translateX(-50%)`)을 공유해서 사실상 가운데 정렬이었음.
- 내 포켓몬 쪽: `#battle-back-info-text`의 `left`를 hp바의 왼쪽 끝 좌표(`calc(50% - 40px - (var(--info-width) * 0.8 / 2))`)로 직접 계산해서 넣고 `transform`(기존 `translateX(-50%)`)을 제거 — 그 좌표에서 그대로 오른쪽으로 내용이 쌓이므로 왼쪽 끝이 자연히 hp바 왼쪽 끝과 일치함(CSS만 수정, `style.css`).
- 상대(야생) 포켓몬 쪽: `battleStartBtn` 핸들러에서 `monsterInfoText.style.left`를 hp바의 오른쪽 끝 좌표(`calc(50% + 40px + (var(--info-width) * 0.8 / 2))`)로 바꾸고, `transform: translateX(-100%)`를 인라인으로 추가해서 그 좌표가 태그의 오른쪽 끝이 되도록 함(`script.js`). 배틀 프리뷰를 닫을 때(`battlePreviewCloseBtn`) 이 인라인 `transform`도 함께 초기화해서, 포획 게임 쪽 기본 정렬(중앙, `translateX(-50%)`)이 원래대로 돌아오게 함.

## 25. 배틀할 포켓몬 선택 화면을 도감식 + 최대 3마리 슬롯 구조로 변경

- `#battle-modal`(배틀할 포켓몬 선택 창)에 도감(`#dex-info-form-grid`)의 폼 칸과 같은 톤의 "배틀 슬롯" 3칸(`#battle-slot-row` > `.battle-slot` × 3)을 목록(`#battle-list`)과 결정 버튼 사이에 추가. 목록에서 포켓몬을 누르면 빈 슬롯에 순서대로 등록되고, 이미 슬롯에 있는 걸 다시 누르거나 채워진 슬롯 자체를 눌러도 선택 해제됨(`battleParty` 배열 + `renderBattleSlots()`가 목록의 `selected` 강조/제목의 "(n/3)"/결정 버튼 활성화까지 한 번에 갱신).
- 슬롯은 폼 칸과 달리 이름표 없이 스프라이트+이름만으로 정사각형 한 칸(`aspect-ratio:1/1`)으로 구성(요청대로). 3자리가 다 차면 나머지 미선택 목록 행은 흐리게 표시되고 클릭도 막힘(`#battle-list.party-full .battle-row:not(.selected)`), 선택된 행은 계속 눌러서 뺄 수 있음.
- 슬롯 안에는 도감 정보 화면의 아이콘(정지 이미지)이 아니라 `#dex-info-sprite`(`renderDexInfoSprite`)와 완전히 동일한 계산식으로 **실제 앞모습 움직이는 애니메이션**을 재생함(`renderBattleSlotSprite`) — 슬롯마다 독립된 토큰/타이머(`battleSlotTokens`/`battleSlotAnimTimerIds`)를 둬서 연속으로 빠르게 골라도 늦게 도착한 이미지 로딩 결과가 엉뚱한 슬롯을 덮어쓰지 않게 함.
- "시작하기" 버튼은 "결정하기"로 이름을 바꾸고, 슬롯에 최소 1마리 이상 있으면 활성화됨. 실제 배틀 로직(교체/다마리 전투)은 아직 없어서, 지금은 눌렀을 때 슬롯 맨 앞(`battleParty[0]`)이 예전과 동일하게 뒷모습 프리뷰의 주인공으로 쓰임 — 2번째/3번째 슬롯은 아직 선택만 가능하고 실제 배틀에는 반영되지 않음(다음 패치 후보).

## 26. 배틀할 포켓몬 선택을 전용 목록 대신 포켓몬 도감 재사용으로 변경

- 지난 절(25)에서 만든 `#battle-modal`(도감을 흉내 낸 전용 목록 `.battle-row` + 하단 슬롯 3칸)을 통째로 삭제하고, 실제 `#dex-modal`(포켓몬 도감)을 `dexPickerMode` 플래그로 "배틀 선택 모드"가 되게 만들어 재사용함 — 도감의 검색/잡음 필터/폼 그리드(메가·거다이맥스·이로치 포함)/잠금(실루엣) 표시 로직은 전혀 건드리지 않음.
- "포켓몬 배틀" 버튼(`battleBtn`)을 누르면 `dexPickerMode = true`로 켠 채 기존 `openDexModal()`을 그대로 호출 — 검색창 초기화 + 목록 화면부터 도감이 열림. 종을 누르면 예전처럼 정보 화면(폼 그리드)까지 들어가서 **정확한 폼/이로치를 고른 뒤** 큰 카드 바로 아래 새로 생긴 "슬롯에 추가" 버튼(`#dex-add-to-battle-btn`)으로 슬롯에 등록함(`updateDexAddToBattleBtn()`이 폼을 바꿀 때마다 라벨을 "슬롯에 추가"/"슬롯에서 빼기"로, 못 잡은 폼이면 비활성으로 갱신).
- 지난 절의 정사각형 슬롯 3칸(실제 앞모습 애니메이션 재생, `renderBattleSlotSprite`)은 그대로 재사용하되 `#dex-modal`(`#dex-box`) 하단으로 옮김(`#dex-battle-slot-row`) — 목록 화면이든 정보 화면이든 항상 하단에 고정으로 보이고, 설정/도감 초기화/치트 코드 페이지에서는 숨김(`updateDexPickerBarVisibility()`, 각 화면 전환 함수 끝에서 호출). 채워진 슬롯을 직접 눌러도 빠짐.
- "결정하기" 버튼(`#dex-battle-decide-btn`, 옛 `#battle-start-btn`)은 슬롯에 1마리 이상 있으면 활성화되고 라벨에 "(n/3)"을 표시. 누르면 예전과 동일하게 슬롯 맨 앞(`battleParty[0]`)이 뒷모습 프리뷰의 주인공으로 쓰이고, 선택 모드를 끄고(`dexPickerMode = false`) 슬롯을 비움.
- ×(닫기)로 도감을 닫으면 선택 모드였을 경우 취소로 취급해 슬롯을 비움. 반대로 "포켓몬 도감" 버튼(시작화면/결과화면 둘 다)은 항상 `dexPickerMode = false`로 강제해 일반 브라우징 모드로만 열리게 함(`openDexModalNormal()`).

## 27. 배틀 선택 모드 다듬기: 추가/빼기 버튼 제거 + 도감 창 크기 유지

- **추가/빼기 버튼 삭제, 폼 칸 클릭으로 통합**: 26에서 만든 "슬롯에 추가"/"슬롯에서 빼기" 버튼(`#dex-add-to-battle-btn`, `updateDexAddToBattleBtn()`)을 완전히 삭제. 대신 폼 그리드 칸(`.dex-form-cell`) 클릭 핸들러(`dexInfoFormGridEl`)에 슬롯 토글 로직을 얹어서, 큰 카드 미리보기(`showDexInfoForm`)와 슬롯 등록/해제가 한 번의 클릭으로 같이 일어나게 함 — 이미 슬롯에 있으면 다시 눌러서 해제, 3자리가 다 찼거나 못 잡은 폼이면 미리보기만 되고 등록은 안 됨.
- 버튼이 없어지면서 "이미 슬롯에 있는지" 알려줄 유일한 텍스트 피드백이 사라져서, 폼 칸 자체에 초록 체크 배지(`.dex-form-cell.in-party::after`)를 추가함 — `markDexFormGridPartyCells()`가 그리드를 새로 그릴 때(`renderDexFormGrid`)와 슬롯이 바뀔 때(`renderBattleSlots`)마다 호출되어 항상 최신 상태를 반영. 빨간 테두리(`.selected`, "지금 미리보기 중")와는 별개 개념이라 동시에 표시될 수 있음.
- **선택 모드 창 크기를 도감과 동일하게 유지**: 지금까지는 슬롯 바(`#dex-battle-slot-row`)+결정 버튼이 고정 `height:480px`인 `#dex-box` 안쪽 마지막 flex 자식으로 끼어들어서, 목록/정보 화면(둘 다 `flex:1`)이 그만큼 눌려 줄어들어 있었음. 이제 `#dex-box`의 기존 내용(헤더~치트 페이지)을 새 래퍼 `#dex-core`로 감싸고, `#dex-core`에 예전 콘텐츠 영역과 정확히 같은 고정 높이 420px(= 480 − 위 패딩34 − 아래 패딩18 − 테두리 4px×2)를 줌. `#dex-box` 자신은 `height:480px` 고정을 버리고 `height:auto`로 바꿔서, 일반 도감 모드에서는 지금까지와 완전히 동일한 480px로 보이고, 배틀 선택 모드에서는 `#dex-core`(420px 고정) 아래에 슬롯 바+결정 버튼이 붙는 만큼만 박스 전체가 자동으로 더 길어짐 — 목록/정보 화면 크기는 전혀 줄어들지 않음. 닫기/뒤로가기 버튼(`position:absolute`)은 `#dex-core`가 `position`을 지정하지 않아 계속 `#dex-box` 기준으로 배치되므로 위치 변화 없음.

## 28. 선택 모드 창이 게임 프레임 밖으로 밀려나는 문제 수정 ("잡음" 줄 제거 + 잡은 것만 표시)

- 27에서 `#dex-box`를 `height:auto`로 바꿔 슬롯 바만큼 창이 자동으로 길어지게 했는데, 이 게임은 `#game-container`가 **항상 고정 370×600px**(`overflow:hidden`, 화면 크기는 JS `transform:scale()`로 전체를 축소/확대)라서, 길어진 창이 그 600px 한도를 넘어 선택 모드 창이 게임 프레임 밖으로 밀려나 보이는 문제가 있었음. `max-height`+내부 스크롤로 가두는 방안 대신, **덜 중요한 UI를 없애서 공간을 확보**하는 방식으로 해결함.
- **"잡음" 체크박스+카운트 줄(`#dex-count-bar`) 제거**: 배틀 선택 모드(`dexPickerMode`)에서는 이 줄을 항상 숨김. 단순히 숨기기만 하면 `#dex-core`(고정 높이) 안에서 그 공간이 `#dex-list`(`flex:1`)에 흡수될 뿐 박스 전체는 안 줄어들기 때문에, `#dex-count-bar`에 명시적 `height:20px`를 주고 `#dex-box.picker-mode #dex-core { height: calc(420px - 20px - 12px) }`(388px)로 **`#dex-core` 자체 높이를 그만큼 줄여서** 확보한 공간이 실제로 `#dex-box` 총 높이에서 빠지게 함 — 그 공간을 슬롯 바+결정 버튼이 대신 채움. `.picker-mode` 클래스는 `updateDexPickerBarVisibility()`가 `dexBoxEl`에 토글.
- **선택 모드에서는 잡은 종/폼만 표시**: `renderDexList()`의 목록 필터에 `dexPickerMode`면 무조건 `isSpeciesColored`(잡음 체크박스와 동일 조건)를 적용해 미포획 종은 목록에서 아예 제외. `renderDexFormGrid()`도 `dexPickerMode`면 `colored`가 아닌 칸(일반/이로치 가상 칸 둘 다)은 그리드에 만들지 않음 — 실루엣 칸이 사라져 스크롤 깊이도 줄어듦. `registerDexCatch()`가 종을 등록할 때 항상 정확한 폼도 같이 등록하므로 그리드가 완전히 비는 경우는 없음.
- 부작용 보정: `openDexInfo(species)`가 예전엔 항상 대표폼(`repId`)부터 미리보기했는데, 선택 모드에서는 대표폼 자체를 못 잡았을 수 있어(그리드엔 잡은 폼만 보임) 처음부터 "???"/실루엣으로 보일 뻔한 문제가 있었음 — 그리드를 그린 직후 실제로 표시된 첫 칸(=잡은 폼)을 초기 미리보기로 쓰도록 고쳐서, 선택 모드 진입 시 항상 실제로 잡은 포켓몬이 먼저 보이게 함.

## 29. 폼별 전용 뒷모습 전수 보강 (front:back 1:1 대응)

- 지금까지 배틀 뒷모습(`back`)은 "normal" 카테고리 알트폼(리전폼/성별폼/코스튬/특수폼 등)을 종(species) 단위로만 묶어서 하나의 뒷모습을 공유했음(예: 굴레를 벗어난 후파(`720-1`)가 속박된 후파(`720`)와 같은 뒷모습을 씀) — `script.js`의 `backSpriteInfo()`가 `fileId = category === 'normal' ? info.species : id`로 애초에 폼별 파일을 시도조차 안 했기 때문. 메가(`mega`)/거다이맥스(`gmax`)만 폼별 전용 뒷모습이 있었음.
- **`Pokemon Another Red_PWT_250821`**(1차 소스, 기존 자산과 동일 화풍)와 **`pokerogue-beta`**(2차 소스) 두 폴더를 뒤져서 폼별 전용 뒷모습을 찾아 채움:
  - Another Red: 이 프로젝트의 기존 앞모습 파일과 Another Red의 `Front`/`Front shiny` 폴더를 **내용 해시로 대조**해서(파일명 추측 없이) id↔심볼 매칭을 복원한 뒤, 그 심볼로 `Back`/`Back shiny`에서 뒷모습을 찾아 `<id>.png`로 복사 — **871장** 확보(정상 434종+2×이로치, 거다이맥스 1종).
  - pokerogue-beta: Another Red에 없던 나머지는 pokerogue의 `assets/images/pokemon/back`(+`back/shiny`)에서 이 프로젝트 id와 **파일명이 그대로 일치**(일부는 `mega_x`→`mega-x`처럼 언더스코어↔하이픈 별칭)하는 파일을 찾아 **90장** 추가 확보(대부분 최근 추가된 "팬 메가" 47종 중 43종 + 성별폼 3종).
  - 남은 4종(`670-mega`, `978-mega`/`978-1-mega`/`978-2-mega`)은 두 소스 어디에도 매칭되는 파일이 없거나(670-mega) curly/droopy/stretchy 3폼 중 어느 게 어느 id인지 판별할 근거가 없어서(978 시리즈) **추측 대신 미해결로 남김** — 지금까지처럼 종 단위 폴백(`baseBackSpriteInfo`)으로 표시됨.
  - `back_shiny/902-female.png`(pokerogue산)는 받아온 뒤 메타데이터를 보니 TexturePacker로 90프레임을 불규칙하게 꽉 채워넣은 텍스처 아틀라스였음(우리 게임의 "가로로 프레임을 이어붙인 필름스트립" 재생 방식과 근본적으로 안 맞아서 그대로 쓰면 화면이 깨짐) — 이건 반영하지 않고 삭제, 그 폼의 이로치만 계속 종 단위 폴백으로 남음(비이로치는 Another Red산이라 정상 반영됨).
  - `pokemon_back_sprite_offsets.js`를 전체 재생성(`back`: 1462, `back_shiny`: 1461, `back_mega`/`back_mega_shiny`: 91, `back_gmax`/`back_gmax_shiny`: 34개 — front와 사실상 1:1).
- **버그 수정(오프셋 실측 스크립트 + 재생 로직)**: 기존 실측/재생 로직이 "프레임은 항상 세로 길이(h)와 같은 폭의 정사각형 타일을 가로로 이어붙인 시트"라고 가정했는데, pokerogue산 뒷모습 다수가 정사각형이 아닌 단일 프레임(예: 112×51)이라 이 가정이 깨짐 — 그대로 두면 프레임 폭을 h로 착각해 그림 오른쪽이 잘리거나(오프셋 측정 단계) 정사각형으로 찌그러져 보임(재생 단계). "가로폭이 세로폭의 정확한 배수일 때만 정사각형 타일 시트로 보고, 아니면 이미지 전체를 직사각형 프레임 1장으로 취급"하는 규칙으로 통일함 — 오프셋 생성 스크립트(`build_back_offsets_xywh.py`)와 실제 재생 함수(`displayBackSprite()`) 양쪽에 동일하게 적용, 기존 정사각형 시트(Another Red산)는 전과 100% 동일하게 동작함(회귀 없음).
- `backSpriteInfo()`의 `fileId`를 `id` 고정으로 변경(species 폴백 분기 제거) — 이제 폼별 전용 파일이 있으면 그걸 쓰고, 없는 극소수(위 4종 + 902-female 이로치)만 기존 `displayBackSprite()`의 `probe.onerror` → `baseBackSpriteInfo()`(종 단위) 폴백이 자동으로 처리함(코드 변경 없이 기존 안전장치 그대로 재사용).

## 30. 액션박스 "싸운다"/"포켓몬" 버튼 + 배틀 중 포켓몬 교체

- 액션박스 버튼 라벨/역할 변경: "공격하기" → **"싸운다"**(기능은 그대로, `#battle-attack-btn`), 비활성 장식이던 "도망치다×1" → **"포켓몬"**(`#battle-switch-btn`, 이제 활성화되어 실제로 동작함). "충전하기"는 그대로 비활성 장식 유지.
- "포켓몬"을 누르면 배틀 선택 슬롯과 똑같이 생긴(정사각형 3칸, 실제 앞모습 애니메이션 재생) 교체 메뉴(`#battle-switch-menu`)가 뜸 — 결정하기를 누를 때 골랐던 파티(`battleParty`, 최대 3마리)를 보여줌. 지금까지는 배틀이 시작되자마자 `battleParty`를 비웠는데, 이제 배틀이 끝날 때까지(`battlePreviewCloseBtn`에서 비움) 유지하도록 바꿔서 교체 기능이 가능해짐.
- 다른 칸을 눌러도 바로 교체되지 않고 "골라두기"만 됨(파란 테두리 `.battle-slot.pending-switch`, 다시 누르면 해제) — 취소 버튼 왼쪽에 새로 생긴 **"확인"** 버튼(`#battle-switch-confirm-btn`, 뭔가 골라뒀을 때만 활성화)을 눌러야 실제로 교체됨(뒷모습/이름/타입 뱃지가 결정하기를 처음 눌렀을 때와 동일한 방식으로 다시 그려짐). 스치듯 눌러서 실수로 교체되는 걸 막기 위함. 지금 나가있는 칸(`activePartyIndex`)은 빨간 테두리(`.battle-slot.active-out`)로 표시되고 눌러도 골라지지 않음. "취소"나 빈 칸 클릭은 그냥 골라둔 것만 취소/무시. 실제 포켓몬 게임과 달리 아직 플레이어 쪽 hp/기절 개념이 없어서 아무 포켓몬으로나 자유롭게 교체 가능(모든 파티원이 항상 "의식 있음" 상태).
- 리팩토링: 슬롯에 "앞모습 애니메이션 재생/정지/비우기"를 담당하던 코드(`renderBattleSlotSprite`/`stopBattleSlotAnimation`/`clearBattleSlot`, 원래 배틀 선택 슬롯 `#dex-battle-slot-row` 전용)를 `createSlotSpriteController(slotEls)` 팩토리로 일반화 — 배틀 선택 슬롯(`battleSlotController`)과 이번에 새로 만든 교체 메뉴 슬롯(`switchSlotController`) 둘 다 이 팩토리 하나로 만들어서 코드 중복 없이 재사용함.

## 31. 뒷모습 스프라이트 전량 교체 (another_red_aio 소스로 재추출)

- 29에서 두 소스(`Pokemon Another Red_PWT_250821` + `pokerogue-beta`)로 빈 칸만 채웠던 것과 달리, 이번엔 사용자가 제공한 더 완전한 팩 **`C:\Users\덕문중학교\Downloads\another_red_aio`**("올인원" 빌드, 같은 팬게임의 최신/통합 버전으로 추정 — 대표적으로 `HOOPA.png`가 옛 소스와 바이트 단위로 동일)로 **뒷모습을 처음부터 다시 전량 교체**함(빈 칸 채우기가 아니라 기존 출처와 무관하게 전부 덮어씀).
- 방식은 29와 동일(내용 해시 대조로 id↔심볼 매칭 복원, 파일명 추측 없음) — 이번엔 프로젝트의 **현재 앞모습 전부**(1591개 id, front/front_shiny 각각)를 `another_red_aio`의 `Front`/`Front shiny`와 해시 대조해서 **100% 매칭**(비이로치 1591/1591, 이로치 1591/1591) — 이 소스가 기존 두 소스보다 훨씬 포괄적임을 확인.
- 매칭된 심볼로 `Back`/`Back shiny`에서 뒷모습을 찾아 `<id>.png`로 전부 복사/덮어씀 — **3174장** 반영(정상 back 1459+back_shiny 1458, 메가 94+95, 거다이맥스 34+34). 결과 파일 수: `back` 1462, `back_shiny` 1461, `back_mega`/`back_mega_shiny` 95, `back_gmax`/`back_gmax_shiny` 34 — front와 사실상 1:1 유지.
- **29에서 미해결이던 4종(`670-mega`, `978-mega`/`978-1-mega`/`978-2-mega`)이 이번 소스엔 전부 있어서 해결됨**(`FLOETTE_6`, `TATSUGIRI_3`/`_4`/`_5` 심볼로 매칭 — `back_mega`가 91→95장으로 늘어난 이유). `902-female`(대쓰여너 성별폼)도 비이로치는 이번에 새로 반영됨(`BASCULEGION_female` 심볼).
- ~~여전히 남은 소수(정상 5종, 메가 1종)는...~~ **(정정, 세션 후반 재확인)**: 위 문장은 부정확했음 — 실제로 파일을 열어 확인해보니 `711` 비이로치/`25-1` 이로치/`678-female`·`876-female` 양쪽/`323-mega` 비이로치는 **전부 이미 전용 뒷모습이 존재**함(이전 패스에서 이미 반영돼 있었고, 이번 aio 패스가 재확인만 못 한 것뿐 — 실제 화면엔 정상 표시됨). 정말로 파일 자체가 없는 건 **`902-female`(대쓰여너 성별폼) 이로치 딱 하나**뿐(지난 패스에서 깨진 텍스처 아틀라스라 삭제했던 그 건, 대체 소스 없음).
- `pokemon_back_sprite_offsets.js`를 `build_back_offsets_xywh.py`로 전체 재측정(29에서 이미 반영된 "정사각형 타일 vs 직사각형 단일 프레임" 판정 규칙 그대로 재사용, 회귀 없음) — 전량 교체된 그림들의 실측 좌표가 최신 상태로 갱신됨. `script.js` 로직은 이번엔 건드리지 않음(29에서 이미 `fileId` 고정 + 폴백 처리가 되어 있어서 그대로 재사용).

## 32. 뒷모습에도 "정지 이미지 크기 보정" 적용

- 앞모습엔 `SPRITE_SIZE_REF_SPECIES_NORMAL`/`_SHINY`(형제 폼은 애니메이션인데 이 폼만 정지 이미지라 원본 캔버스 크기가 안 맞는 종을, 형제 폼 기준으로 표시 크기를 재계산하는 보정)이 있었는데 뒷모습엔 없었음 — `displayBackSprite()`는 원본 캔버스 높이(`frameH`) 하나로만 배율을 정해서, 해당되는 종은 배틀 프리뷰에서 다른 포켓몬보다 훨씬 크게 보이는 문제가 있었음.
- 스크립트로 전수 스캔해서 확정(추측 아님) — 같은 species 안에서 종 기준형이 여러 프레임 애니메이션인데 다른 폼이 프레임 1장짜리 정지 이미지인 경우만 골라냄(단순 크기 비율 차이·메가진화처럼 원래 더 크게 그려진 정상적인 폼은 제외):
  - `back`(비이로치): `172-1`(피츄 폼), `678-female`, `791-1`(솔가레오), `792-1`(루나아라), `802-1`(마샤도), `876-female`, `893-1`(자루도 폼) — 7종.
  - `back_shiny`: 위 7종 + `25-1`~`25-6`(피카츄 모자 폼, 이로치만 문제 — 프론트와 동일 패턴) — 13종.
  - 피카츄 이로치 모자 폼은 기준형(피카츄, 47px) 대비 정지 이미지 캔버스가 288px로 **6배 이상** 차이나서 가장 심각했음.
- `script.js`에 `BACK_SPRITE_SIZE_REF_SPECIES_NORMAL`/`_SHINY` 명단을 새로 추가하고, `displayBackSprite()`에 프론트의 `effectiveFrameSize`와 동일한 공식(`효과 높이 = 기준형 실측 h × 이 폼의 원본 캔버스 ÷ 이 폼 자신의 실측 h`)을 추가— **크기 계산에만** 적용되고, 위치(dx/dy)·프레임 자르기(frameW/frameCount)·pixelScale은 전부 원본 `frameH` 기준 그대로 유지(프론트와 동일 원칙, 회귀 없음).
- **정정**: `716`(제르네아스)을 처음엔 "형제 폼이 없어 보정해도 no-op"이라며 자기 자신(`'716':'716'`)을 참조하게 넣었는데, 이후 카테고리 전체(normal/mega/gmax)·양방향(기준형이 정지인 경우 포함)으로 다시 정밀 스캔해보니 실제로는 `716-1`(활동 모드, 1200×120 10프레임 애니메이션)이라는 형제 폼이 있었음 — `'716': '716-1'`로 수정해서 실제로 보정이 걸리게 함. 이 재스캔에서 그 외엔 normal/mega/gmax 어느 카테고리에서도 명단 누락이 없는 것으로 확인됨(정지 이미지 관련해서는 이걸로 전부 커버됨).
- `node --check` 통과.

## 33. 마지막 뒷모습 결손 1건(`902-female` 이로치) 해결 — 원인은 확장자 대소문자

- front/back 개수가 안 맞는 마지막 1건(`back_shiny/902-female`)을 분석해보니, 파일이 없는 게 아니라 **`another_red_aio\Graphics\Pokemon\Back shiny\BASCULEGION_female.PNG`가 대문자 확장자(`.PNG`)라서** 31의 자동 탐색(대소문자 구분하는 `.png` 필터)에서 누락된 것으로 확인됨(해당 폴더 1623개 파일 중 대문자 확장자는 이 파일 하나뿐).
- 처음엔 이 `BASCULEGION_female.PNG`(6696바이트, 288×288 정지 1프레임)를 그대로 복사했었는데, 사용자가 스프라이트시트 이미지를 직접 보여주며 지적 — 확인해보니 같은 폴더의 `BASCULEGION_1.png`(34327바이트, 10980×122, 기준형 `902`와 완전히 동일한 90프레임 애니메이션 규격)가 진짜 맞는 파일이었음. `BASCULEGION_female.PNG`는 2023년 날짜의 훨씬 오래된 파일로, 소스 팩 안에 남아있던 불완전한 placeholder였던 것으로 보임(front 쪽에서도 이 두 심볼이 해시가 동일해서 서로 바꿔써도 되는 관계였는데, back 쪽만 이 자리에 잘못된 쪽이 들어있었음).
- `back_shiny/902-female.png`를 `BASCULEGION_1.png`로 다시 교체하고 재실측 — `pokemon_back_sprite_offsets.js`의 `"902-female"`을 `{"x": 1.0, "y": -2.5, "w": 94, "h": 51}`(기준형 `902`와 완전히 동일)로 갱신. 이제 정상적으로 90프레임 애니메이션이라 32의 정지 이미지 보정 대상도 아니게 되어, `BACK_SPRITE_SIZE_REF_SPECIES_SHINY`에 추가했던 `'902-female': '902'` 항목도 다시 제거함(정지 이미지가 아니니 보정 자체가 불필요).
- 결과: `front_shiny`/`back_shiny` 파일 수는 여전히 1462개로 1:1 일치, 이번엔 내용도 올바른 애니메이션으로 확정.
- `node --check` 통과.

## 34. `678-female`/`876-female` 뒷모습도 같은 "잘못된 심볼" 문제였음 — 진짜 애니메이션으로 교체

- 33의 `902-female` 건과 완전히 같은 패턴이 두 군데 더 있었음(사용자가 `another_red_aio`의 `MEOWSTIC_1.png` 스프라이트시트 이미지를 직접 보여주며 지적) — 32에서 "정지 이미지라 보정이 필요하다"고 판단했던 `678-female`(냐오닉스 성별폼)/`876-female`(에써르 성별폼)이, 사실은 aio 안에 진짜 애니메이션 파일이 있는데도 옛 pokerogue 소스(29에서 채워진, static/leftover 파일)가 그대로 남아있던 것.
- 재조사(사용자 지시로 관련 종 전체 재검토): `MEOWSTIC.png`(기준형, 10프레임)와 `MEOWSTIC_1.png`(44프레임, 냐오닉스 성별폼과 프론트 해시 완전 일치)가 별도로 존재했고, `INDEEDEE.png`(기준형, 74프레임)와 `INDEEDEE_1.png`(74프레임, 에써르 성별폼과 프론트 해시 완전 일치)도 마찬가지였음 — 둘 다 31의 자동 매칭 단계에서 무슨 이유에서인지 누락되고 옛 소스가 안 덮어써진 채 남아있었던 것으로 보임.
- 같은 조사에서 `172-1`(피츄 폼)/`791-1`/`792-1`/`802-1`(솔가레오·루나아라·마샤도)/`893-1`(자루도 폼)/피카츄 이로치 모자 폼(`25-1`~`25-6`)은 aio에 더 나은 대체 파일이 없는 것을 직접 확인함(형제 폼이 정지 이미지 하나뿐) — 이것들은 32의 정지 이미지 보정을 그대로 유지.
- `back`/`back_shiny` 양쪽의 `678-female.png`을 `MEOWSTIC_1.png`(4224×96, 44프레임)로, `876-female.png`을 `INDEEDEE_1.png`(3848×52, 74프레임)로 교체하고 재실측 — `pokemon_back_sprite_offsets.js`의 `"678-female"`을 `{"x": -1.5, "y": 0.5, "w": 65, "h": 75}`, `"876-female"`을 `{"x": 4.0, "y": -0.5, "w": 36, "h": 51}`로 갱신(양쪽 이로치 상태 모두 동일값). 이제 정상 애니메이션이라 32의 정지 이미지 보정 대상이 아니게 되어, `BACK_SPRITE_SIZE_REF_SPECIES_NORMAL`/`_SHINY`에서 `678-female`/`876-female` 항목도 제거함.
- `node --check` 통과.

## 35. `back_gmax_shiny/131-gmax`(거다이맥스 라프라스) — GIF가 `.png`로 위장된 파일, 재인코딩으로 해결

- 사용자가 "이미 스프라이트인데 왜 정지 이미지로 분류됐냐"고 지적해서 재조사 — 33/34와 다른 종류의 문제였음. 파일 내용을 직접 열어보니 `back_gmax_shiny/131-gmax.png`가 **실제로는 GIF89a 포맷인데 확장자만 `.png`**였음(PNG 시그니처가 아니라 `GIF89a`로 시작). 이래서 정지 이미지 판정 스크립트(PNG IHDR 헤더를 직접 읽는 방식)가 엉뚱한 바이트를 읽어 "정지 1프레임"으로 잘못 분류됐던 것.
- 처음엔 `another_red_aio`/`Pokemon Another Red_PWT_250821` 둘 다 동일한 GIF-as-PNG 파일이라 소스 자체가 없다고 보고 `pokerogue-beta`의 정지 이미지(93×93, 1프레임)로 대신 채웠는데, 사용자가 실제 내용물(14포즈가 가로로 이어붙은 필름스트립) 스크린샷을 보여주며 이걸 쓰자고 지적 — Pillow로 다시 열어보니(확장자 무시하고 내용으로 포맷을 판별하는 라이브러리라) 이 GIF는 진짜 애니메이션이 아니라 **1330×95 캔버스 하나에 95×95 포즈 14개를 이미 가로로 이어붙여놓은 한 장짜리 이미지**였음 — 이 게임이 원래 뒷모습에 쓰는 "정사각형 타일을 가로로 이어붙인 시트" 방식과 완전히 같은 구조라, 단지 GIF 컨테이너 포맷으로 저장돼 있었을 뿐임. 그래서 pokerogue 대체본 대신 **이 원본 픽셀을 그대로 PNG로 재인코딩**해서 씀(별도 프레임 합성 없이 GIF의 유일한 프레임을 그대로 PNG로 저장).
- 결과: `back_gmax_shiny/131-gmax.png`가 진짜 14프레임 애니메이션(93×93 콘텐츠, 1330×95 시트)으로 정상 작동함 — front_gmax_shiny(20프레임)보다는 프레임 수가 적지만 실제 원작 그림을 온전히 씀. `pokemon_back_sprite_offsets.js`를 `{"x": 0.0, "y": 1.0, "w": 93, "h": 93}`로 갱신(우연히도 31 이전부터 있던 원래 값과 정확히 일치 — 오프셋 측정 스크립트는 처음부터 Pillow를 써서 이 GIF 내용을 올바르게 읽고 있었고, 문제는 표시/판정 로직 쪽에서만 있었던 것).
- `node --check` 통과.

## 36. `back_shiny/710`(호바귀) — 대체 심볼(`_1`/`_2`/`_3`)만 확인하고 기준형(`PUMPKABOO`) 자체를 놓쳤던 실수 정정

- 35까지 "`710`은 심볼 4개(PUMPKABOO/_1/_2/_3) 전수 확인 완료, 대체 없음"이라고 결론냈었는데, 실제로는 접미사 없는 기준형 `PUMPKABOO`의 Back shiny(1056×96, 11프레임 애니메이션)를 빼놓고 `_1`/`_2`/`_3`(전부 288×288 정지)만 갖고 "전부 정지라 대체 없음"이라 잘못 판단했었음 — 사용자가 실제 필름스트립 이미지를 보여주며 지적.
- `710`은 이 프로젝트에 별도 폼 id(`710-1` 등)가 없는 단일 id라, 접미사 없는 기준형 심볼이 가장 자연스러운 매칭 대상이었는데 그걸 검토 대상에서 빠뜨렸음(다른 종은 전부 형제 심볼 비교였어서 기준형 자체를 다시 점검할 생각을 못 함).
- `back_shiny/710.png`를 `PUMPKABOO.png`(Back shiny, 1056×96, 11프레임)로 교체 — `back`(비이로치)은 이미 이 심볼과 동일한 규격(1056×96)이라 그대로 둠. `pokemon_back_sprite_offsets.js`의 `back_shiny."710"`을 `{"x": -0.5, "y": 3.5, "w": 39, "h": 41}`로 갱신.
- `node --check` 통과.

## 37. `890-gmax`(무한다이노) — 사용자가 더 적합한 정지 이미지로 교체, 오프셋 재실측(애니메이션 전환 아님)

- 사용자가 `back_gmax/890-gmax.png`/`back_gmax_shiny/890-gmax.png` 파일 자체를 새 이미지(90×93)로 직접 교체함 — 35~36에서 "세 소스 어디에도 애니메이션 버전이 없음"으로 확인됐던 항목.
- 주의: 새 이미지도 **여전히 정지 1프레임**임(90×93, `w % h ≠ 0`라 애초에 타일 판정도 안 됨) — 678-female/876-female/131-gmax/710처럼 "잘못된 심볼 대신 진짜 애니메이션을 찾아 교체"한 사례와는 다름. 이건 "더 나은 정지 이미지로 교체"한 것뿐이라, `890-gmax`는 여전히 `172-1`/`893-1`과 함께 "정지 이미지(대체 애니메이션 없음)" 목록에 남아있음.
- 새 이미지 기준으로 `build_back_offsets_xywh.py`와 동일한 방식(프레임 중심−그림 중심)으로 재실측 — `pokemon_back_sprite_offsets.js`의 `back_gmax`/`back_gmax_shiny` 양쪽 `"890-gmax"`를 전부 `{"x": 0.0, "y": 0.0, "w": 88, "h": 91}`로 갱신(그림이 캔버스를 거의 꽉 채우고 있어 좌표 보정값은 0에 가까움).
- `node --check` 통과.

> 아래 38 ~ 54는 전부 같은 세션(2026-09-12)에서 이어서 진행한 패치라, 버전은 하나하나 올리지 않고 전부 묶어서 **버전 1.1** 하나로 관리함(위 "버전 관리 방침" 참고).

## 38. 3v3 AI 트레이너 배틀 — 실전 전투 시스템 전면 구현 (야생 개념 폐기)

- 배경: "9. 다음 패치 후보"에 쌓여있던 항목들("플레이어 hp/피격/기절", "실제 기술/데미지 계산, 승패 판정, 결과 화면", "대화창 메시지 시스템", "배틀 슬롯 2/3번째 실전 반영")을 한 번에 구현하면서, 배틀의 성격 자체를 "야생 포켓몬 관찰"에서 "AI 트레이너와의 3 대 3 대결"로 바꿈.
- **신규 파일 `pokemon_battle_data.js`**: 이 팬게임의 원본 데이터 파일(`types.dat`/`moves.dat`, Ruby Marshal 직렬화)을 직접 파싱해서 만든 실제 포켓몬 데이터 기반 상수 모음.
  - `TYPE_CHART`: 18개 타입 전체의 약점/저항/무효(`weaknesses`/`resistances`/`immunities`) — 현재 포켓몬 게임 실제 상성표와 동일하게 검증됨.
  - `TYPE_SIGNATURE_MOVES`: 타입 18개 × (물리/특수) 조합마다 실제로 존재하는 대표 기술 1개씩(이름/타입/분류 모두 원본 데이터에서 교차 검증) — 예: 노말·물리=몸통박치기, 불꽃·특수=화염방사 등.
  - `CATEGORY_ICON_INDEX`: `layout/category.png` 스프라이트 시트의 물리(0)/특수(1)/상태(2) 순서.
  - Marshal.load가 원본 게임 클래스 정의 없이는 실패하는 문제는, 없는 클래스/모듈을 에러 메시지에서 잡아 즉석에서 빈 스텁 클래스로 채워 넣고 로드가 성공할 때까지 반복하는 방식(Ruby)으로 해결.
- **전투 흐름 변경**: "싸운다" 버튼을 누르면 액션박스 메인 메뉴(`#battle-main-menu`) 대신 기술 선택 메뉴(`#battle-move-menu`)로 전환됨. 내 포켓몬의 속성1/속성2 기준으로 최대 4개 버튼(속성1-물리, 속성1-특수, 속성2-물리, 속성2-특수, 단일 속성이면 2개만) 노출 — 각 버튼은 `types.png`+`category.png` 아이콘을 조합해 표시.
- **상성 데미지 계산**: 기술 타입 vs 상대 포켓몬의 타입(1~2개)을 `TYPE_CHART` 기준으로 배율 계산(약점 2배 중첩 가능/저항 0.5배 중첩 가능/무효 0배) → 기본 데미지에 곱해 hp 차감. 배율에 따라 "효과가 굉장했다!"/"효과가 별로인 듯하다..."/"효과가 없는 것 같다..." 문구를 실제 포켓몬 게임처럼 출력.
- **대화창화된 액션박스**: 공격 진입 시 액션박스가 `#battle-message-box`로 전환되어, 포획 게임의 `typeMessage`와 동일한 한 글자씩 타이핑 연출로 "OOO의 몸통박치기!" → 효과 문구 → (기절 시) "OOO는 쓰러졌다!" 순으로 메시지를 흘려보냄. 참고 톤은 포켓몬 챔피언스.
- **선공권**: 요청대로 지금은 랜덤(추후 공/방/특공/특방/스피드 종족치 반영 여부 결정 예정). 실제로는 AI가 즉시 계산하지만 "한쪽이 누르면 다른 한쪽은 응답 대기" 흐름을 나중에 실제 멀티플레이로 바꿀 수 있도록, AI의 기술 선택도 콜백 형태로 분리해둠(다만 사용자 피드백에 따라 이번 패치에서는 인위적인 대기 연출/딜레이는 넣지 않음 — 구조만 준비).
- **기절 처리**: 내 포켓몬이 기절하면 포켓몬 교체창이 자동으로 강제 오픈(`battleSwitchForced`, 취소 버튼 숨김)되어 살아있는 다음 포켓몬을 반드시 선택해야 함. AI 포켓몬이 기절하면 살아있는 다음 포켓몬으로 자동 교체(연출 포함, 기존 `playWildFaintAnimation`이 하던 처리를 `playAiFaintAnimation`으로 계승) — 별도 선택 UI 없음. 이미 기절한 슬롯은 교체 메뉴에서 회색조 처리(`.battle-slot.fainted`)되어 선택 불가.
- **승패 판정 + 결과 화면**: 한쪽의 3마리가 모두 기절하면 즉시 종료 — `#battle-result-overlay`가 뜨며 승/패 텍스트와 "처음으로" 버튼 표시.
- **AI 로직**: 이번 패치에서는 팀 구성은 랜덤(추후 공/방/특공/특방/스피드 종족치가 도입되면, 그때 내 파티와 비슷한 종족치대로 맞춰 구성할 예정 — 사용자 확인 완료). 기술 선택은 매 턴 상대 포켓몬 기준으로 상성이 가장 유리한 기술을 우선 선택.
- 관련 UI/CSS: `#battle-main-menu`/`#battle-move-menu`/`.battle-move-btn`/`.battle-move-icons`/`#battle-message-box`/`#battle-result-overlay` 등을 `style.css` 끝에 새 블록으로 추가, `#battle-back-hp-fill`도 기존 "항상 100% 고정"에서 실제 내 포켓몬 hp를 반영하도록 변경.
- `node --check` 통과.

## 39. 내 포켓몬 기절 연출을 상대(AI) 쪽과 동일하게 통일

- 사용자 요청: "내 포켓몬이 쓰러질 때 효과를 상대가 쓰러질 때랑 같도록 해줘".
- 38 시점의 `playPlayerFaintAnimation`(내 포켓몬/뒷모습)은 "뒷모습엔 앞모습만큼 정밀한 실측 데이터가 없다"고 보고 단순 하강+페이드아웃으로 구현했었는데, 실제로는 `BACK_SPRITE_OFFSETS`에 앞모습(`SPRITE_OFFSETS`)과 동일한 형태의 실측 콘텐츠 높이(`off.h`)가 이미 존재했음(다른 곳(`displayBackSprite`의 위치 계산, 샤이니 이펙트 크기)에는 이미 쓰이고 있었음) — 그래서 상대 쪽 `playAiFaintAnimation`과 완전히 동일한 방식으로 구현 가능했음.
- `displayBackSprite()`가 계산하는 "화면상 실제 그림 높이"(`off.h * pixelScale`)를 새 전역 변수 `currentBackContentHeight`에 저장하도록 하고, `playPlayerFaintAnimation()`을 `playAiFaintAnimation()`과 동일한 로직(그림 최하단에 clip-path로 땅 라인을 고정하고, `#battle-back-sprite`만 그 아래로 일정 속도(`WILD_FAINT_SPEED`)로 미끄러뜨림 — 지속시간도 동일한 `WILD_FAINT_MIN_DURATION`/`WILD_FAINT_MAX_DURATION` 범위로 계산)로 교체. 기존 `PLAYER_FAINT_DURATION`(고정 500ms 페이드아웃) 상수는 제거됨.
- 교체 확정 시(`battleSwitchConfirmBtn`)와 배틀 프리뷰 종료 시(`resetBattlePreview`)에 새로 쓰인 `battle-back-sprite-box`의 임시 clip-path를 정리하는 코드 추가(상대 쪽이 `#monster`에 대해 이미 하던 정리와 동일).
- `node --check` 통과.

## 40. 공격하기 메뉴 단순화 — 물리/특수/랭크업/회복 고정 4버튼 + 랭크업 시스템 추가

- 사용자 요청: "게임을 단순화하고 싶어" → "공격하기 누르면 물리, 특수, 랭크업, 회복이렇게 뜨게 해줘 타입이나 카테고리 이모티콘을 버튼으로 쓰지말고 그리고 물리, 특수는 각각 사용하는 포켓몬의 속성을 가진 공격으로 판단해".
- 38에서 만든 "포켓몬 타입(최대 2개)×카테고리(물리/특수)로 정해지는 대표 기술 최대 4개 중 선택" 방식(`TYPE_SIGNATURE_MOVES`, 타입/카테고리 아이콘 조합 버튼)을 걷어내고, "공격하기"를 누르면 포켓몬이 무엇이든 항상 고정된 4개 텍스트 버튼(물리/특수/랭크업/회복)만 뜨도록 단순화함.
- **물리/특수**: 기술 타입 = 공격하는 포켓몬 자신의 타입을 그대로 씀. 단일 속성이면 그 속성 하나, 물/전기처럼 2개 속성이면 두 속성의 상성 배율을 곱해서 계산(`getAttackEffectiveness`) — 예: 상대가 물에 약점(2배)이면서 전기에 저항(0.5배)이면 최종 1배. 물리와 특수는 이제 상성 계산이 완전히 동일(랭크업 스택 여부만 다름) — 포켓몬별 실제 기술 목록은 여전히 없음(아래 "다음 패치 후보" 갱신 참고).
- **랭크업**(신규): 사용할 때마다 "공격 랭크"가 1단씩 오르고(최대 6단), 데미지에 배율 `1 + 0.5×랭크`가 곱해짐 — 1단 1.5배 ~ 6단 4배(사용자 지정값). 이미 6단이면 "더 이상 오르지 않는다!" 메시지만 뜨고 턴은 그대로 소모됨. 기절하거나 다른 포켓몬으로 교체되면(강제/자진 모두) 랭크는 0으로 초기화됨(실제 포켓몬 게임의 스탯 랭크 초기화 규칙과 동일).
- **회복**(신규): 최대 hp의 50%를 회복(최대치 초과 불가). 이미 만피면 "이미 체력이 가득하다!" 메시지만 뜨고 턴 소모. 플레이어는 횟수 제한 없음.
- 랭크업/회복도 공격과 동일하게 그 턴의 행동을 다 씀(추가 행동 아님) — 쓰는 동안 상대는 정상적으로 자기 턴 행동을 함.
- **AI 로직 갱신**(`pickAiAction`): 자기 hp가 30% 이하이고 이 포켓몬으로 아직 2번 미만 회복했으면 회복 최우선(무한정 안 죽는 걸 막기 위한 상한 — 포켓몬이 바뀌면 이 횟수도 초기화됨). 그게 아니면 랭크업이 최대치가 아니고 지금 공격해도 확실히 유리(상성 2배 이상)하지 않으면 30% 확률로 랭크업, 그 외엔 물리/특수 중 무작위로 공격(상성상 둘이 동일하므로).
- 데이터/UI 정리: `pokemon_battle_data.js`에서 더 이상 안 쓰는 `TYPE_SIGNATURE_MOVES`/`CATEGORY_ICON_INDEX`를 제거(타입 상성표 `TYPE_CHART`만 남음). `style.css`의 타입/카테고리 아이콘 관련 규칙(`.battle-move-icons`/`.battle-move-type-icon`/`.battle-move-cat-icon`/`.battle-move-name`)도 제거하고, `.battle-move-btn`을 텍스트 전용 버튼(테두리 있는 4등분 버튼)으로 재정의.
- `node --check` 통과.

## 41. 기술(물리/특수/랭크업/회복) 버튼 디자인을 "싸운다"/"포켓몬" 버튼과 통일

- 사용자 요청: "기술 버튼 디자인은 싸우다 포켓몬 버튼 과 같게 만들어야해".
- 40에서 새로 만든 물리/특수/랭크업/회복 버튼에 테두리가 있는 상자 디자인(`border: 1.5px solid #000` 등)을 임의로 넣었었는데, 사용자가 액션박스 메인 메뉴의 "싸운다"/"포켓몬"(`.menu-item` — 테두리·배경 없이 글자만 있는 디자인)과 다르다고 지적.
- `renderBattleMoveMenu()`에서 버튼 클래스에 `menu-item`을 같이 붙여서(`class="menu-item battle-move-btn"`) "싸운다"/"포켓몬"과 완전히 같은 폰트/크기/여백/눌림 효과를 그대로 상속받게 함. `style.css`의 `.battle-move-btn`에 있던 테두리/배경/패딩/폰트 크기 등 커스텀 스타일은 전부 제거하고, `#battle-move-list`(가로 4등분 배치) 레이아웃에만 관여하도록 남김.
- `node --check` 통과.

## 42. 포켓몬 교체도 턴을 쓰는 행동으로 변경 + 교체는 항상 싸우기보다 선행 + AI 자진 교체

- 사용자 요청: "포켓몬 교체도 턴을 쓴것으로 해 대신 싸우기 상호작용 보다 교체가 항상 선행하도록 해 그리고 ai도 자신의 판단에 따라 교체하도록해 만약 나와 상대가 같은턴에 교체를 누르면 먼저교체되는건 랜덤으로 정해 기술나가는 거처럼".
- 기존엔 "포켓몬" 버튼으로 여는 자진 교체(기절로 인한 강제 교체와 달리)가 턴 개념과 무관하게 그 자리에서 즉시 적용되고 끝이었음(AI 턴도 전혀 진행되지 않음). 이제는 자진 교체도 "이번 턴에 낼 내 행동"이 되어, AI의 이번 턴 행동과 함께 판정됨.
- **순서 규칙**(`startPlayerTurn`): 교체를 고른 쪽은 항상 공격/랭크업/회복보다 먼저 실행됨. 양쪽 다 교체를 골랐으면 어느 쪽이 먼저인지는 기존 기술 선공/후공과 동일하게 50:50 랜덤. 한쪽만 교체를 골랐으면(교체 쪽) → (남은 쪽의 행동) 순서로 고정. 둘 다 교체가 아니면 기존처럼 랜덤 순서.
- 교체는 데미지를 주지 않으므로, 교체 다음에 이어지는 상대의 공격은 방금 새로 나온 포켓몬을 대상으로 정상적으로 들어감(실제 포켓몬 게임과 동일한 흐름).
- **AI 자진 교체**(`pickAiTurnAction`): AI도 이제 기절 없이 스스로 교체를 선택할 수 있음. 지금 나가있는 포켓몬이 상대(플레이어)에게 상성상 많이 불리하면(공격 배율 0.5배 이하) 살아있는 다른 포켓몬 중 더 유리한 배율을 가진 개체가 있는지 확인하고, 있으면 50% 확률로 그 포켓몬으로 교체를 선택함(항상 교체하면 너무 뻔해서 확률을 둠). 아니면 기존 회복→랭크업→공격 판단(`pickAiAction`)을 그대로 씀.
- 리팩터링: 화면상 AI 쪽 포켓몬을 지정한 인덱스로 내보내는 로직을 `switchAiToIndex(targetIndex, onDone)`으로 일반화해서, 기절로 인한 강제 교체(`autoSwitchAiNext` — 이제 "다음 생존 개체를 찾아 switchAiToIndex에 위임"하는 얇은 래퍼)와 새 자진 교체가 같은 연출 코드를 공유하도록 함. 내 쪽도 마찬가지로 `applyPlayerSwitch(targetIndex, onDone)`로 분리해서, 기절 강제 교체(메시지 없이 즉시 적용)와 자진 교체(먼저 "OOO(으)로 교체했다!" 메시지를 보여준 뒤 적용)가 같은 로직을 공유함.
- 교체 확정(`battleSwitchConfirmBtn`)은 이제 강제 여부로 분기됨 — 기절로 인한 강제 교체는 예전처럼 즉시 적용 후 이어서 진행 중이던 턴 처리를 계속하고, 자진 교체는 더 이상 그 자리에서 바로 적용하지 않고 `startPlayerTurn({ switch: 인덱스 })`로 넘겨서 AI 행동과 함께 턴을 진행함.
- `node --check` 통과.

## 43. 내 포켓몬 교체 시에도 상대(AI) 교체와 동일한 페이드아웃/페이드인 연출 추가

- 사용자 요청: "교체할때 상대 포켓몬이 죽고 다음포켓몬 나올때 처럼 페이드 인 되도록해 교체되는건 페이드 아웃되게하고".
- 42까지는 내 포켓몬 교체(`applyPlayerSwitch`)가 연출 없이 즉시 스프라이트만 바꿔치기했음(상대 쪽 `switchAiToIndex`는 이미 기절 후 다음 포켓몬이 나올 때와 동일하게 opacity 0→1 페이드를 쓰고 있었음). 이제 내 쪽도 같은 방식으로 통일: 나가는 포켓몬(스프라이트/hp바/이름표)이 페이드아웃 → 새 포켓몬 뒷모습을 미리 로드 → 페이드인.
- `#battle-back-sprite-box`/`#battle-back-info`/`#battle-back-info-text`(상대 쪽 `#monster`/`#monster-info`/`#monster-info-text`와 대응)에 동일한 `transition: opacity 0.4s ease-in`을 추가하고, `applyPlayerSwitch()`를 `switchAiToIndex()`와 같은 타이밍(`MONSTER_SHRINK_DURATION`=400ms 페이드아웃 → 교체 → 400ms 페이드인)으로 재작성함. 강제 교체(기절 후)와 자진 교체(포켓몬 버튼) 둘 다 이 함수를 공유하므로 양쪽 다 자동으로 적용됨.
- `resetBattlePreview()`에도 이 새 인라인 opacity들을 정리하는 코드를 추가(페이드 도중 배틀을 닫아도 다음 배틀이 깨끗한 상태로 시작하도록).
- `node --check` 통과.

## 44. 액션박스(배틀) 멘트 속도를 포획 메시지와 동일하게 통일

- 사용자 질문: "액션박스에 나오는 멘트 속도가 캐치박스의 대사 속도랑 같아?" → 확인해보니 포획 메시지는 글자당 42ms(`CAPTURE_CHAR_DELAY`)인데 배틀 메시지는 22ms(`BATTLE_MESSAGE_CHAR_DELAY`)로, 주석엔 "살짝 빠르게"라 적혀 있었지만 실제로는 거의 2배 가까이 빨랐음. 사용자가 "같은 속도로 바꾸고 싶어"라고 요청.
- `BATTLE_MESSAGE_CHAR_DELAY`를 고정값(22) 대신 `CAPTURE_CHAR_DELAY`를 그대로 참조하도록 바꿔서, 앞으로 포획 속도가 바뀌어도 배틀 속도가 자동으로 같이 따라가도록 함(두 값이 따로 놀다가 또 어긋나는 것을 방지).
- `node --check` 통과.

## 45. 자진 교체 UI를 별도 교체창 대신 액션박스 안의 이름 버튼 목록으로 변경

- 사용자 요청: "포켓몬 버튼을 눌러 교체할때 교체창이 뜨는 시스템을 버리고 액션박스에 교체 가능한 2개 포켓몬의 이름을 버튼 형식으로 보여주고 선택해서 교체하도록 해줘".
- "포켓몬" 버튼을 눌렀을 때(자진 교체 한정 — 기절로 인한 강제 교체는 그대로 유지) 뜨던 별도 오버레이 교체창(`#battle-switch-menu`: 슬롯 스프라이트 3칸 + 확인/취소 버튼)을 걷어내고, "싸운다"의 기술 메뉴와 완전히 같은 자리·같은 디자인(`menu-item`/`battle-move-btn` — 아이콘 없이 텍스트만)으로 새 인라인 메뉴(`#battle-switch-inline-menu`)를 추가함.
- 지금 나가있지 않고 기절하지 않은 포켓몬(최대 2마리 — 파티가 3마리 기준)의 이름만 버튼으로 나열하고, 누르면 별도 확인 절차 없이 바로 그 포켓몬으로 교체를 "선택"한 것으로 처리해서 `startPlayerTurn({ switch: idx })`로 넘어감(42에서 만든 "교체는 항상 싸우기보다 선행" 로직을 그대로 씀 — 달라진 건 고르는 화면뿐, 턴 처리 로직은 무변경). 교체 가능한 포켓몬이 하나도 없으면(둘 다 기절) 버튼 대신 "교체할 포켓몬이 없다..." 안내 문구만 표시.
- 기절로 인한 강제 교체는 여전히 예전 `#battle-switch-menu`(슬롯 그리드 + 확인 버튼, 취소 불가)를 그대로 씀 — "고르지 않으면 못 넘어가는" 성격이 자진 교체와 달라서 그대로 남겨둠. 다만 이제 자진 교체 경로에서는 이 메뉴가 절대 열리지 않으므로, 그 안의 "취소" 버튼은 사실상 강제 교체 중엔 항상 숨겨진 채로만 존재하는 상태가 됨(동작엔 문제 없음).
- CSS는 `#battle-move-menu`/`#battle-move-list`/`.battle-move-btn` 규칙을 `#battle-switch-inline-menu`/`#battle-switch-inline-list`/`.battle-switch-inline-btn`과 공유하도록 셀렉터만 확장해서 완전히 같은 디자인을 재사용함.
- `node --check` 통과.

## 46. 교체할 포켓몬이 없으면 "포켓몬" 버튼을 "충전하기"처럼 비활성화

- 사용자 요청: "둘다 기절해서 교체 대상 없으면 지금 충전하기 버튼처럼 만들어".
- 45에서는 교체 가능한 포켓몬이 없을 때 "포켓몬" 버튼을 눌러야만(그래서 인라인 메뉴를 열어봐야만) "교체할 포켓몬이 없다..."는 걸 알 수 있었음. 이제 `updateBattleSwitchBtnState()`가 매번 메인 메뉴가 뜰 때마다(턴이 끝날 때/배틀 시작할 때) 지금 나가있지 않고 기절하지 않은 파티원이 있는지 미리 확인해서, 없으면 "포켓몬" 버튼 자체를 `disabled` 처리함 — "충전하기"와 완전히 같은 회색 비활성 스타일(`.menu-item:disabled`)로 보임.
- `node --check` 통과.

## 47. 기절로 인한 강제 교체도 자진 교체와 동일한 방식(액션박스 이름 버튼)으로 통일

- 사용자 요청: "내 포켓몬이 기절해서 교체할때도 동일한 방식으로 교체하도록 해줘".
- 45에서 자진 교체("포켓몬" 버튼)만 액션박스 안 이름 버튼 목록(`#battle-switch-inline-menu`)으로 바꾸고, 기절로 인한 강제 교체는 예전 별도 오버레이(`#battle-switch-menu` — 슬롯 스프라이트 3칸 + 확인 버튼)를 그대로 뒀었는데, 이제 강제 교체도 완전히 같은 이름 버튼 방식을 쓰도록 통일함.
- `openForcedSwitch()`가 이제 `renderBattleSwitchInlineMenu()`를 호출해서 액션박스에 이름 버튼을 띄움(메시지창을 먼저 숨기고 그 자리에 표시). 취소는 여전히 불가능해야 하므로, `battleSwitchForced`가 true일 때는 뒤로가기(‹) 버튼을 숨김.
- 이름 버튼의 클릭 처리도 하나로 합침: `battleSwitchForced`가 true면 확인 절차 없이 즉시 `applyPlayerSwitch()`를 적용하고 원래 진행 중이던 턴 처리(`pendingForcedSwitchCallback`)를 이어가고, 아니면(자진 교체) 기존처럼 `startPlayerTurn({ switch: idx })`로 넘어감.
- 그 결과 예전 오버레이 교체창 시스템(`#battle-switch-menu` HTML, `renderBattleSwitchMenu`/`switchSlotEls`/`switchSlotController`/`battleSwitchConfirmBtn`/`battleSwitchCancelBtn`/`pendingSwitchIndex` 관련 코드)이 이제 완전히 쓰이지 않게 됨 — 동작엔 영향 없지만(단순히 호출이 안 될 뿐) 코드만 남아있는 상태라, 원하면 다음에 통째로 정리(삭제) 가능.
- `node --check` 통과.

## 48. 기술/교체 메뉴 버튼 목록이 오른쪽으로 쏠려 보이던 문제 수정

- 사용자 질문: "뒤로가기(‹) 버튼때문에 버튼이 오른쪽으로 치우친거 같은건 기분탓이야?" → 기분탓이 아니라 실제 CSS 문제였음.
- 원인: `#battle-move-menu`/`#battle-switch-inline-menu`에 뒤로가기(‹) 버튼 공간으로 `padding-left: 22px`만 있고 오른쪽엔 여백이 없었음 — 그 안의 버튼 목록(`#battle-move-list`/`#battle-switch-inline-list`, `justify-content: space-around`)이 "왼쪽으로 22px 밀린 좁은 영역" 안에서만 가운데 정렬되다 보니, 액션박스 전체 기준으로는 오른쪽으로 쏠려 보였음. 버튼 4개(물리/특수/랭크업/회복)가 꽉 찬 기술 메뉴에선 덜 티 났지만, 이름 버튼이 1~2개뿐인 교체 메뉴에서 특히 두드러짐.
- `padding-right: 22px`를 똑같이 추가해서 왼쪽·오른쪽 여백을 대칭시킴 — 이제 버튼 목록이 액션박스 정중앙 기준으로 표시됨.
- CSS만 수정(`node --check` 대상 아님, 육안 확인 완료).

## 49. 교체 이름 버튼 — 슬롯 순서 전부 표시 + 타입 아이콘 + 선택 불가 상태 표시

- 사용자 요청: "교체할때 액션박스에 슬롯순으로 이름을 넣고 이름옆에 타입에 따라 아이콘을 래이아웃 폴더의 types_short를 사용해서 보여줘 그리고 3포켓몬 중 기절하거나 나가있는 포켓몬은 선택이 안되도록해줘 기절해서 교체하거나 포켓몬 버튼 눌러 교체하거나 똑같이".
- 지금까지 `renderBattleSwitchInlineMenu()`는 교체 가능한(살아있고 + 지금 나가있지 않은) 포켓몬만 골라서 그만큼만 버튼을 만들었는데, 이제 파티 3마리를 슬롯 순서 그대로 전부 버튼으로 보여주고, 지금 나가있거나 기절한 슬롯은 버튼을 없애는 대신 `disabled` 처리(클릭 불가 + 회색)만 해서 "왜 못 고르는지"가 그대로 보이도록 바꿈.
- 이름 옆에는 `images/pokemon/layout/types_short.png`(28x560px, `types.png`와 똑같이 세로 20줄 순서라 기존 `TYPE_ICON_INDEX`를 그대로 재사용)로 만든 16x16 타입 아이콘을 붙임(이중 속성이면 2개). `.battle-switch-inline-btn`을 `display:flex`로 바꿔 이름 + 아이콘을 가로로 나란히 배치.
- 선택 불가 버튼은 `.menu-item:disabled`(기존 "충전하기"와 같은 회색) 스타일을 그대로 물려받고, 옆의 타입 아이콘도 `.battle-switch-inline-btn:disabled .battle-switch-inline-type-icon`로 흐리게(회색조) 처리해서 버튼 전체가 "지금은 못 고름"으로 한눈에 보이도록 함.
- 이제 3마리가 항상 다 나오기 때문에 "교체할 포켓몬이 없다..." 안내 문구(`.battle-switch-inline-empty`) 분기는 도달할 수 없게 되어 코드/CSS 모두 제거.
- `renderBattleSwitchInlineMenu()`는 기절로 인한 강제 교체(`openForcedSwitch`)와 자진 교체("포켓몬" 버튼) 양쪽이 이미 똑같이 호출하는 함수라, 이번 수정 하나로 두 경로 모두 동일하게 적용됨(사용자가 요청한 "기절해서 교체하거나 포켓몬 버튼 눌러 교체하거나 똑같이").
- `node --check` 통과.

## 50. 교체 메뉴 타입 아이콘 제거

- 사용자 요청: "교체메뉴에서 타입아이콘은 삭제해" — 49에서 넣은 이름 옆 타입 아이콘(types_short.png 기반)을 다시 뺌.
- `renderBattleSwitchInlineMenu()`에서 타입 아이콘 span을 만들던 부분을 제거하고 이름만 표시하도록 되돌림(슬롯 순서 전체 표시 + 나가있거나 기절한 슬롯 disabled 처리는 그대로 유지).
- `style.css`에서도 49 때 추가했던 `.battle-switch-inline-type-icon`, 그 disabled 회색조 규칙, 아이콘 배치를 위한 flex 레이아웃 규칙을 제거 — 다시 `.battle-move-btn`/`.battle-switch-inline-btn` 공용 규칙(가운데 정렬)만 적용됨.
- `node --check` 통과.

## 51. 교체 메뉴 — 교체 불가능한 포켓몬 다시 숨김 + 타입 아이콘 다시 추가

- 사용자 요청: "교체 메뉴에 교체할 수 없는 포켓몬(이미 나가있거나 기절)은 보여주지마 그리고 타입아이콘 다시 추가해".
- 49에서 "3마리 전부 보여주고 disabled 처리"로 바꿨던 것을 다시 45/47 때처럼 되돌림 — `renderBattleSwitchInlineMenu()`가 지금 나가있거나 기절한 슬롯은 아예 목록에서 제외하고, 교체 가능한 포켓몬만 버튼으로 나열함(전부 교체 불가면 "교체할 포켓몬이 없다..." 문구 표시 — 관련 `.battle-switch-inline-empty` CSS도 복원).
- 50에서 뺐던 이름 옆 타입 아이콘(`images/pokemon/layout/types_short.png`, `TYPE_ICON_INDEX` 재사용, 16x16)을 다시 추가 — 이제 disabled 상태가 없으므로 회색조 처리 규칙 없이 아이콘만 다시 붙음.
- 기절 교체(`openForcedSwitch`)와 자진 교체("포켓몬" 버튼) 둘 다 이 함수 하나를 그대로 같이 쓰므로 이번에도 두 경로 모두 동일하게 적용됨.
- `node --check` 통과.

## 52. 배틀 파티 선택 화면 — 빈 슬롯 실선화, 3마리 다 채워야 결정, 랜덤 버튼 추가

- 사용자 요청: "포켓몬 배틀 눌러서 게임시작전 슬롯 채울때 빈칸 슬롯을 점선 아니고 실선으로해 색은 그대로 두고 그리고 3마리를 모두 등록해야 결정하기 버튼이 활성화 되도록하고옆애 괄호로 (n/3)이건 지워 그리고 결정하기 버튼 옆에 무작위버튼을 새로 만들어서 그 버튼 누르면 무작위로 슬롯이채워지도록해". (버튼 이름/간격은 이후 여러 번 미세 조정을 거쳤음 — 아래는 그 최종 결과로 정리함)
- `.battle-slot.empty`의 `border-style`을 `dashed` → `solid`로 바꿈(테두리 색 `#b8bcc2`는 그대로 유지) — 빈 슬롯도 채워진 슬롯과 같은 실선 테두리로 보임.
- `renderBattleSlots()`에서 "결정하기 (n/3)" 라벨을 없애고 "결정"으로 고정, 활성화 조건을 `battleParty.length === 0`(하나라도 있으면 활성화)에서 `battleParty.length < 3`(3마리 다 채워야 활성화)로 변경.
- "결정" 버튼 왼쪽에 "랜덤" 버튼(`#dex-battle-random-btn`)을 새로 추가 — 둘을 가로로 감싸는 `#dex-battle-action-row`(가운데 정렬, 버튼 사이 gap 30px)로 배치.
- `node --check` 통과.

## 53. 랜덤 버튼 — 매번 다시 눌러도 재추첨되도록 수정

- 사용자 요청: 처음엔(52) 빈 슬롯만 채우는 방식이었는데, "무작위버튼 계속 눌러서 슬롯 채웠어도 다시 누르면 다시 무작위로 선택되도록 해".
- 클릭할 때마다 잡은 적 있는 폼(`isFormColored`/`isFormShinyColored` 기준 — 치트로 잡은 것으로 치는 것도 포함) 전체를 후보로 다시 섞어서 파티 3마리를 통째로 새로 뽑아 교체하도록 변경 — 이미 랜덤으로 채웠든 직접 골랐든 상관없이 계속 눌러서 재추첨 가능.
- `node --check` 통과.

## 54. 슬롯/교체창 이름 표시 — 이로치(✨) 표시 제거, 포획 게임과 동일하게

- 사용자 요청: "슬롯이랑 교체창에서 포켓몬 이름은 포획게임에서 뜨는 이름처럼 보이게 해 이로치 표시 안되게".
- 배틀 파티 선택 슬롯(`renderBattleSlots()`)과 교체 메뉴(`renderBattleSwitchInlineMenu()`) 둘 다 이로치일 때 이름 뒤에 붙이던 "✨"를 빼고, 포획 게임 화면(`monsterNameEl`)과 똑같이 이름만 표시하도록 통일함.
- 이미 안 쓰이는 예전 오버레이 교체창(`renderBattleSwitchMenu` — 47 이후 호출되지 않음)은 그대로 둠(동작에 영향 없음).
- `node --check` 통과.

## 55. 전투 멘트 다듬기 (상성 효과 5단계 세분화, 랭크업/회복 선언 멘트 추가) + 죽은 코드 제거

- 배경: 액션박스에 나오는 멘트를 전수조사한 표를 보고, 하나씩 무엇을 바꿀지 정한 뒤 한 번에 반영해달라는 요청으로 진행함.
- 상성 효과 문구를 3단계(무효/굉장/별로)에서 5단계로 세분화:
  - 배율 0배(무효): `그러나 효과가 없는 것 같다...` → `{이름}에게는 효과가 없는 것 같다...`로 변경. 실제 포켓몬 게임처럼 "상대 트레이너의"류 접두사 없이 방어 포켓몬 이름만 그대로 넣음(사용자가 "실제 게임처럼" 하기로 결정).
  - 배율 4배 이상: `효과가 매우 굉장했다!!` 신설.
  - 배율 1배 초과 4배 미만(기존 2배 등): `효과가 굉장했다!` 그대로 유지.
  - 배율 1배 미만 0.25배 초과(기존 0.5배 등): `효과가 별로인 듯하다...` 그대로 유지.
  - 배율 0.25배 이하: `효과가 매우 별로인 듯 하다...` 신설.
- 랭크업/회복도 물리/특수 공격("{공격자}의 물리 공격!")처럼 먼저 선언 멘트를 띄우도록 추가 — `{공격자}의 랭크업!`, `{공격자}의 회복!`을 각각 성공/실패 판정 멘트보다 먼저 보여줌.
- 죽은 코드 제거:
  - 예전 포켓몬 교체 오버레이 시스템 전체 삭제 — `index.html`의 `#battle-switch-menu`(`#battle-switch-box`/`-title`/`-slot-row`/`-actions`, 확인/취소 버튼) 마크업, `script.js`의 `renderBattleSwitchMenu()`, `switchSlotEls`/`switchSlotController`, `pendingSwitchIndex`, `battleSwitchConfirmBtn`/`battleSwitchCancelBtn` 클릭 핸들러, `resetBattlePreview()` 안의 관련 정리 코드, `style.css`의 `#battle-switch-menu`/`-box`/`-title`/`-slot-row`/`-actions`, `.battle-slot.active-out`, `.battle-slot.pending-switch`, `.battle-slot.fainted`, `#battle-switch-menu.forced #battle-switch-cancel-btn` 규칙까지 전부 삭제(47부터 실제로는 호출되지 않던 코드).
  - `renderBattleSwitchInlineMenu()`의 도달 불가능한 "교체할 포켓몬이 없다..." 분기와 `.battle-switch-inline-empty` CSS 삭제(자진 교체는 후보 없으면 "포켓몬" 버튼 자체가 비활성화되고, 강제 교체는 후보가 없을 상황이면 그 전에 승패가 먼저 갈리므로 실제로 도달 불가능했음).
- `node --check` 통과.

## 56. 상대 포켓몬 이름 표기를 실제 게임 방식("상대 {이름}")으로 통일

- 배경: 55에서 정리한 멘트 표를 보다가 "상대 트레이너의 리자몽의 물리공격이라고 해?"라는 질문에서 시작 — 실제 포켓몬 게임은 "트레이너의"를 붙이지 않고 그냥 "상대 {이름}"만 쓴다는 걸 확인하고, 이 프로젝트의 모든 관련 멘트를 그 방식으로 통일함.
- `resolveSingleAction()`의 `attackerName`과 `handleFaint()`의 `name`: 상대(AI) 포켓몬일 때 "상대 트레이너의 {이름}" → "상대 {이름}"로 변경(공격/랭크업/회복 선언·성공·실패 멘트, 기절 멘트에 전부 적용됨).
- 상성 효과-무효(0배) 멘트: 55에서는 접두사 없이 이름만 넣기로 했었는데, 이번에 다른 멘트들과 통일하면서 상대 포켓몬이 방어할 때는 "상대 {이름}"로 접두사를 붙이도록 다시 조정함(내 포켓몬이 방어할 때는 그대로 접두사 없음).
- 상대 포켓몬 교체 멘트: `상대 트레이너가 {이름}을(를) 내보냈다!` → `상대가 {이름}을(를) 내보냈다!`로 변경(이름 없는 상대를 "상대"로만 지칭하는 실제 게임 관례에 맞춤, "트레이너" 삭제).
- `node --check` 통과.

## 57. 배틀 시작 연출 — "상대가 ~ 내보냈다!" → 상대 등장 → "가랏! ~!" → 내 포켓몬 등장 순으로 변경

- 사용자 요청: "게임 시작 되면 바로 포켓몬이 등장하고 싸우다 또는 포켓몬 버튼이 액션박스에 보이는 게 아니라 먼저 '상대가 {이름}을(를) 내보냈다!'라고 한 후에 상대 포켓몬이 나오고(교체할때랑 같은) 그후에 '가랏! {이름}!'라고 한 후에 내 포켓몬이 나오게 하고 그 후에 버튼 선택하도록".
- 예전엔 "결정" 버튼을 누르면 상대/내 포켓몬 스프라이트가 즉시 다 표시되고 액션박스도 곧바로 메인 메뉴(충전하기/싸운다/포켓몬)를 보여줬는데, 이제 등장 연출이 끝나야 메인 메뉴가 나타나도록 순서를 바꿈.
- 상대(AI) 포켓몬 등장은 배틀 중 교체할 때 쓰는 `switchAiToIndex(0, ...)`를 그대로 재사용 — "상대가 {이름}을(를) 내보냈다!" 메시지가 뜬 뒤에 페이드인으로 포켓몬이 나타남(교체 연출과 완전히 동일). 이 함수가 지금까지는 `#monster`의 `hidden` 클래스를 벗기지 않았는데(원래 `initGame()`만 하던 일), 배틀 시작 첫 등장에도 재사용하면서 이 처리를 추가함(중간 교체 때는 이미 벗겨져 있어 영향 없음).
- 내 포켓몬 등장은 "가랏! {이름}!" 메시지 후 `applyPlayerSwitch(0, ...)`를 재사용해서 뒷모습을 페이드인시킴(뒷모습/이름/타입/hp바를 전부 이 함수가 채워줌).
- 화면이 열리자마자 지난 배틀의 스프라이트가 잠깐 비쳐 보이지 않도록, 내 뒷모습 영역은 화면을 열기 전에 미리 투명하게 해두고, 두 등장 연출이 끝난 뒤에야 액션박스에 메인 메뉴 버튼을 표시함.
- `node --check` 통과.

## 58. 버튼 이름 "랜덤 선택"/"선택 완료"로 변경 (간격은 30px 유지)

- 버튼 라벨 변경: "랜덤" → "랜덤 선택", "결정" → "선택 완료"(`index.html` 기본 텍스트와 `renderBattleSlots()`가 매번 다시 쓰는 텍스트 둘 다 수정).
- 버튼 사이 gap은 30px로 유지(간격 미세 조절을 여러 번 거쳤으나 최종적으로 처음 값인 30px로 확정).

## 59. 상대 포켓몬 첫 등장 시 페이드인이 안 되던 버그 수정

- 배경: 57에서 배틀 시작 연출을 `switchAiToIndex()` 재사용으로 구현했는데, 실제로 페이드인이 되는지 분석 요청을 받고 확인해보니 상대(AI) 포켓몬의 "첫" 등장에서만 페이드인이 안 되고 즉시 나타나는 버그를 발견함.
- 원인: `#monster`는 배틀 시작 시점엔 `hidden`(display:none) 상태인데, 같은 동기 실행 블록 안에서 `hidden` 클래스 제거와 opacity 0→1 변경이 함께 일어나면 브라우저가 중간 상태를 렌더링(페인트)할 기회가 없어서 `transition: opacity 0.4s ease-in`이 발동하지 않음. 배틀 중 교체 때는 `#monster`가 이미 보이는 상태(hidden 아님)라 이 문제가 없었고, 내 포켓몬 등장(`applyPlayerSwitch`)도 애초에 `hidden`을 쓰지 않아 문제가 없었음.
- 수정: `switchAiToIndex()`에서 `hidden` 클래스를 벗기는 시점을 opacity를 0으로 만드는 시점과 같이 이동함 — "hidden 해제 + opacity 0" → 실제 400ms 경과(기존 `fadeOutPromise`) → 내용 교체 → opacity 1. 이렇게 하면 hidden이 풀린 뒤 실제 시간이 흐르고 나서 opacity가 바뀌므로 브라우저가 중간 상태를 그릴 기회가 생겨 트랜지션이 정상 작동함. 교체 때는 이미 hidden이 없는 상태라 이 변경이 아무 영향 없음(무해한 순서 변경).
- 결과: 내 포켓몬 첫 등장, 상대 포켓몬 첫 등장, 배틀 중 교체(양쪽) 전부 "투명하게 만들고 → 실제 시간 400ms 경과 → 내용 교체 → 다시 보이게" 하는 동일한 구조가 되어 페이드인 이펙트가 완전히 일관되게 동작함.
- `node --check` 통과.

## 60. 상대 포켓몬 체력바가 이름/타입보다 늦게 채워지던 문제 수정

- 배경: 내 포켓몬(교체/첫 등장)과 포획 게임 쪽 새 몬스터 등장을 상대(AI) 포켓몬 등장과 비교 분석한 결과, 포획 게임/내 포켓몬은 "이름·타입(or CP)·체력바를 전부 세팅한 뒤에 페이드인"하는 반면, 상대(AI) 포켓몬만 유일하게 체력바(`resetAiHpBar`)를 페이드인이 끝난 뒤(`setTimeout` 안)에 세팅하고 있어서 이름/타입은 스프라이트와 같이 나오는데 체력바만 뒤늦게 "툭" 채워지는 차이가 있었음을 발견.
- `switchAiToIndex()`는 배틀 시작 상대 첫 등장과 배틀 중 상대 교체 양쪽에 재사용되는 함수라, 이 문제는 두 상황 모두에서 나타났음.
- 수정: `resetAiHpBar(entry.hp)` 호출을 `updateMonsterInfo(monsterObj)` 바로 다음(= opacity를 1로 올리기 전)으로 이동. 이제 스프라이트/이름/타입/체력바가 전부 opacity 애니메이션 시작 전에 준비된 뒤 같이 페이드인되어, 포획 게임·내 포켓몬 쪽과 동일한 패턴으로 통일됨.
- `node --check` 통과.

## 61. 상대 포켓몬 등장 시 체력바·이름·타입 상자(#monster-info/#monster-info-text)가 스프라이트보다 먼저 팝업되던 문제 수정

- 배경: 60 적용 후에도 "체력바부터 먼저 보이는 것 같다"는 피드백을 받고 재검증한 결과, 59에서 `#monster`(스프라이트 박스)의 `hidden` 해제 시점만 앞으로 당기고, `#monster-info`/`#monster-info-text`(체력바·이름·타입이 들어있는 상자)의 `hidden` 해제는 여전히 `updateMonsterInfo()` 안에서 처리되어 opacity를 1로 올리는 시점과 같은 틱에 일어나고 있었음을 발견 — `#monster`는 59 수정으로 제대로 페이드인되는데, `#monster-info`/`#monster-info-text`는 트랜지션 없이 즉시 완전한 모습으로 팝업되어 스프라이트가 다 나타나기도 전에 체력바/이름이 먼저 보이는 것처럼 느껴졌음.
- 수정: `monster.classList.remove('hidden')` 옆에 `monsterInfo.classList.remove('hidden')`, `monsterInfoText.classList.remove('hidden')`도 같이 추가해서, 셋 다 "hidden 벗기기 + opacity 0" → 실제 400ms 경과 → 내용 세팅 → opacity 1"로 통일함(`updateMonsterInfo()` 안의 기존 `remove('hidden')`은 이미 벗겨진 뒤라 중복 호출되어도 무해).
- 최종 검증: 자식 요소인 타입 뱃지(`#monster-types`)와 체력바 채우기(`#monster-hp-fill`)는 자체 opacity 트랜지션이 없어 별도 문제가 없음을 확인했고, `resetBattlePreview()`가 배틀 종료 시 `#monster`/`#monster-info`/`#monster-info-text`에 `hidden`을 다시 붙여서 매 배틀 시작·교체마다 이 케이스가 동일하게 반복됨을 확인 — 이제 포획 게임(`initGame`, 강제 리플로우 방식)·내 포켓몬(`applyPlayerSwitch`, hidden 자체를 안 씀) 쪽과 기법은 다르지만("보이지만 투명한 상태를 브라우저가 렌더링할 기회를 준 뒤 opacity 변경") 효과는 완전히 동일하게 스프라이트·이름·타입·체력바가 함께 페이드인됨.
- `node --check` 통과.

## 62. 회복 성공 멘트가 HP 애니메이션보다 먼저 뜨던 순서 수정

- 사용자 지적: "회복은 선언 후 hp가 찬 후에 회복 성공멘트가 나와야하는데 반대로 된거 같애".
- 확인해보니 실제로 반대였음 — 공격 데미지는 "HP 애니메이션(깎임) 먼저 → 그 다음 효과 멘트" 순서인데, 회복만 "체력을 회복했다!" 멘트가 먼저 뜨고 그 뒤에 HP가 차오르는 애니메이션이 재생되고 있었음.
- 수정: `resolveSingleAction()`의 heal 분기에서 `animatePlayerHp`/`animateAiHp`(HP 차오르는 애니메이션)를 먼저 실행하고, 그 애니메이션이 끝난 뒤(`onDone` 콜백)에 `${attackerName}는 체력을 회복했다!` 멘트를 보여주도록 순서를 바꿈 — 공격 데미지 처리와 동일한 패턴으로 통일됨.
- `node --check` 통과.

## 63. 승패 결과를 액션박스 멘트로 먼저 알리고, 결과 화면에 "다시하기" 버튼 추가

- 사용자 요청: "승패가 갈리면 액션박스에 상대와의 승부에서 졌다! 또는 상대와의 승부에서 이겼다!로 나오고 포획쪽 게임 종료될때와 동일하게 결과창과 처음으로 다시하기 버튼이 보이게 해".
- `endBattleWithResult()`: 예전엔 승패가 갈리자마자 곧바로 결과 오버레이를 띄우며 그 안의 `#battle-result-text`에 `트레이너를 이겼다!`/`트레이너에게 졌다...`를 넣었는데, 이제 다른 배틀 이벤트(기절/교체/공격 등)와 동일하게 먼저 액션박스 멘트로 `상대와의 승부에서 이겼다!`/`상대와의 승부에서 졌다!`를 타이핑해서 보여주고(`showBattleMessage`), 그 멘트가 끝난 뒤에야 결과 화면이 뜨도록 순서를 바꿈(결과 화면의 헤더 텍스트도 동일한 문구로 갱신).
- `index.html`의 `#battle-result-overlay`에 포획 게임 결과 화면(`#result-actions`)과 동일한 세로 스택 레이아웃으로 "다시하기" 버튼(`#battle-result-retry-btn`)을 "처음으로" 옆에 추가(`#battle-result-actions` 래퍼로 감쌈). `style.css`도 버튼 스타일을 `#battle-result-home-btn` 전용에서 `#battle-result-actions button`으로 일반화해서 두 버튼 모두 동일하게 스타일링되도록 함.
- "다시하기" 동작: 포획 게임의 "다시하기"(`startGame`, 시작화면을 건너뛰고 곧바로 재시작)와 같은 취지로, "포켓몬 배틀" 버튼이 하던 파티 선택 화면 진입 로직을 `openBattlePartyPicker()`로 분리해 재사용 — `resetBattlePreview()`로 배틀을 완전히 정리한 뒤 곧바로 파티 선택 화면(도감 모달)으로 다시 진입시킴(시작화면으로 돌아갔다가 "포켓몬 배틀"을 다시 누를 필요 없음).
- `node --check` 통과.

## 64. 배틀 결과 화면을 포획 게임 결과 화면과 완전히 동일한 디자인으로 통일 + 통계 자리는 비워둠

- 배경: 63에서 "다시하기" 버튼만 추가했을 뿐 `#battle-result-overlay`가 여전히 어두운 반투명 배경 + 흰 배경 박스 버튼이라는 별도 디자인이라, 포획 게임 결과 화면(`#result-screen`)과 다르다는 지적을 받고 디자인을 완전히 맞춤.
- `#battle-result-overlay`: 배경을 `#result-screen`과 동일한 밝은 반투명 흰색(`rgba(255,255,255,0.9)`)으로, 레이아웃 gap도 20px로 통일.
- `#battle-result-actions button`(처음으로/다시하기): 흰 배경+검은 테두리 박스 버튼 스타일을 제거하고, 포획 게임 버튼처럼 배경/테두리 없는 순수 텍스트 버튼(`.menu-item` 기본값)으로 통일.
- `#battle-result-text`: 사용자 확인 — 배틀 쪽엔 아직 학습 데이터 연계 통계(점수/정답/오답) 시스템이 없으므로(추후 게임 완성되면 포획 게임처럼 추가 예정), 승패 텍스트를 이 자리에 표시하지 않기로 함. 요소 자체는 나중을 위해 남겨두되 `hidden` 클래스를 추가해 숨기고, `endBattleWithResult()`에서 `textContent`를 채우던 코드도 제거. 승패 소식은 결과 화면이 뜨기 직전 액션박스 멘트("상대와의 승부에서 이겼다!"/"졌다!")로 이미 전달되므로 중복 표시 안 함.
- 결과적으로 배틀 결과 화면은 이제 밝은 배경 위에 "처음으로"/"다시하기" 텍스트 버튼만 뜨는 형태로, 포획 게임 결과 화면과 디자인이 완전히 동일해짐(내용은 배틀 쪽에 아직 통계가 없어 비어있음).
- `node --check` 통과.

## 65. 코드 모듈화: `script.js`(5,747줄)를 10개 파일로 분리

- 배경: `script.js`가 5,747줄까지 커져서 유지보수가 어려워짐에 따라, 도감/포획/배틀/학습(퀴즈)
  기능별로 파일을 분리함(`MODULARIZATION_PLAN.md` v2 참고). `file://`로 직접 여는 구조라 ES 모듈은 쓸 수
  없어서, 기존과 동일하게 여러 `<script>` 태그를 순서대로 로드하는 전역 스코프 공유 방식을 유지함.
- **작업 전 안전장치**: 폴더 전체 백업(`pokemon_catch_game10_backup_20260912`)을 미리 만들어 둠.
- **파일 구성 변경**:
  - `pokemon_sprite_offsets.js` → `pokemon_front_sprite_offsets_data.js`, `pokemon_back_sprite_offsets.js`
    → `pokemon_back_sprite_offsets_data.js` (내용은 무변경, 이름만 통일). 기존 두 파일은 원본 그대로
    폴더에 남겨둠(문제 생기면 되돌릴 수 있도록).
  - `script.js`의 "포켓몬 정보 화면" 섹션 안 순수 데이터 테이블 6종(`DEX_FORM_NAME_OVERRIDES`,
    `DEX_FORM_SUFFIX_LABELS`, `DEX_FORM_CATEGORY`, `DEX_FORM_BUCKET_ORDER`, `DEX_FORM_LABEL_FORCED_SPLIT`,
    `DEX_FORM_SORT_OVERRIDE`)를 새 파일 `pokemon_pokedex_form_data.js`로 분리.
  - 남은 `script.js`(3,646줄)를 함수 단위로 실제 호출 관계를 전수 확인해서 5갈래로 재분리:
    - `script.js`(공용, 약 400줄): 포획·배틀 2개 이상 도메인에서 실제로 호출되는 것만 남김 —
      반응형 스케일링, `displayMonsterSprite`/`preloadImage`/`typeMessage`/`updateMonsterInfo`/
      `renderTypeBadges`/`formatCpTotal`/샤이니 이펙트, 도감·포획이 공유하는 종/폼 목록
      (`NORMAL_IDS`/`DEX_SPECIES_ORDER` 등), `CATEGORY_FOLDER` 등.
    - `pokemon_learning.js`(신규, 학습 데이터 업로드 + 4지선다 퀴즈): 정답/오답 시 동작을
      `setQuizAnswerHandlers(onCorrect, onWrong)` 콜백으로 위임하도록 리팩터함 — 지금은
      `pokemon_catch.js`가 "몬스터볼/도망치다 +1·-1" 콜백을 등록하고, 나중에 `pokemon_battle.js`가
      같은 퀴즈를 "기술 성공/실패" 등으로 재사용할 때도 이 파일은 수정할 필요가 없도록 함(사용자가
      배틀에도 학습 데이터 퀴즈를 재사용할 계획이라고 밝혀서 이 구조로 설계함).
    - `pokemon_pokedex.js`(신규): 전국도감 저장/치트코드/목록·검색·정보화면 로직.
    - `pokemon_catch.js`(신규): 포획 라운드 진행, 타이머·CP합계, 결과화면, 일시정지/포획목록 화면.
    - `pokemon_battle.js`(신규): 3v3 배틀 엔진, 턴 진행, hp바, 기절 연출, 배틀 전용 뒷모습
      스프라이트, 배틀 파티 선택(도감 선택모드 재사용).
  - `index.html` `<script>` 로드 순서: 데이터 파일들 → `script.js`(공용) → `pokemon_learning.js` →
    `pokemon_pokedex.js` → `pokemon_catch.js` → `pokemon_battle.js`.
- **검증**: 전체 5,747줄이 어느 파일로도 누락·중복 없이 정확히 재배치됐는지 줄 단위로 대조,
  5개 로직 파일 + 5개 데이터 파일 전체에서 최상위 선언(`function`/`const`/`let`) 중복이 없는지
  전수 검사(중복 0건), 로드 순서대로 전체를 이어붙여 `node --check`까지 통과시킴(개별 파일
  `node --check`뿐 아니라 실제 브라우저 로드 순서를 흉내낸 결합 검증까지 진행).
- 분리 과정에서 실제 코드로 확인된, 이름만 봐서는 알기 어려웠던 것들: `CATEGORY_FOLDER`가
  도감·포획·배틀 3곳 모두에서 쓰이고 있었던 점, `alignWildMonsterTopToHpBar()`는 이름과 달리
  `battlePreviewActive`를 체크해서 배틀 프리뷰 전용으로만 동작하는 점, "4지선다 퀴즈"/
  "9세대 확장: 스프라이트시트 애니메이션" 같은 섹션 주석 경계 안에 실제로는 다른 기능의 코드가
  섞여 있던 점 등 — 전부 grep으로 실제 호출부를 확인해서 올바른 파일로 배치함.
- 동작 자체(포획/도감/배틀/퀴즈 로직)는 전혀 바꾸지 않고 파일 위치만 재배치한 순수 리팩터링임.
  사용자가 브라우저에서 새로고침 후 핵심 흐름(포획 시작~성공, 도감 열람, 배틀 3판, 퀴즈 충전)을
  직접 확인해야 함.

## 66. 배틀 기술/교체 메뉴의 뒤로가기(‹) 버튼을 스프라이트 애니메이션 아이콘으로 교체

- 사용자 요청: "액션창에서 뒤로가기(<) 버튼을 layout폴더 속 left_arrow를 사용해서 표시할 수 있겠어?".
- 확인 결과 `images/pokemon/layout/left_arrow.png`(40x224px)는 단일 아이콘이 아니라 세로로 8프레임이
  쌓인 애니메이션 스프라이트(프레임당 40x28px, 각 프레임이 살짝 다른 "‹" 모양)였음 — 사용자가 직접
  "8열로 하나씩" 있다고 확인해줌.
- `index.html`: `#battle-move-back-btn`/`#battle-switch-inline-back-btn`의 텍스트 "‹"를 제거하고
  `aria-label="뒤로가기"`로 대체(스크린리더용).
- `style.css`: `.battle-move-back-btn`을 텍스트 스타일 대신 `background-image`로 변경 — 원본을 0.5배
  (20x14px 프레임)로 표시(`background-size: 20px 112px`).
- `pokemon_battle.js`: 두 버튼 모두 배틀 상태와 무관하게 계속 반복 재생되도록, 스크립트 로드 시
  바로 시작하는 `setInterval` 기반 프레임 애니메이션 추가(120ms마다 `background-position-y`를
  -14px씩 이동, 8프레임 순환) — 기존 스프라이트 애니메이션들과 동일하게 캔버스 없이
  background-position만 사용해서 file://에서도 문제없이 동작함.
- `node --check` 통과(개별 파일 + 결합 검증 모두).

## 67. 뒤로가기 화살표 버튼의 투명 배경이 안 보이던 문제 수정

- 사용자 지적: "만족하는데 투명배경이 아니야?"
- 원인: 66에서 `.battle-move-back-btn`을 텍스트 스타일에서 `background-image` 방식으로 바꾸면서
  `background-color`를 명시적으로 지정하지 않아, `<button>` 기본 배경(브라우저 기본 회색/흰색 상자)이
  그대로 남아있었음 — `left_arrow.png` 자체의 투명 배경(알파값 확인 결과 완전 투명/불투명 두 값만
  있어 정상)은 문제 없었지만, 그 뒤에 깔린 버튼 기본 배경 때문에 투명하게 안 보였던 것.
- 수정: `background-color: transparent;`와 `outline: none;`을 명시적으로 추가해서 버튼 자체를
  완전히 투명하게 만듦.
- `node --check` 통과(CSS라 해당 없음 — index.html/JS 변경 없이 style.css만 수정).

## 68. 뒤로가기 화살표가 액션박스 테두리에 겹치던 문제 수정

- 사용자 지적: "빨간색화살표가 액션박스의 검은색 테두리에 겹치지 않게 해줄래?"
- 원인 확인: `#battle-action-box`의 검은 테두리는 CSS `border`가 아니라 `action_box.png`(4045x791)
  이미지 자체에 그려진 그림임 — 실제 렌더 크기(340px 폭)로 스케일링하면 테두리+모서리 장식이
  왼쪽 위 모서리에서 약 6px 정도를 차지하는데, 화살표 버튼이 `top:5px; left:4px`로 그 범위 안에
  걸쳐 있어서 화살표 끝이 테두리 선과 겹쳐 보였음(실측: action_box.png를 실제 렌더 크기로 축소한
  뒤 화살표를 겹쳐서 확인).
- 수정: `.battle-move-back-btn`의 `top`/`left`를 `7px`로 늘려서 테두리 안쪽으로 완전히 들어오게 함.
- `node --check` 해당 없음(CSS만 수정, JS/HTML 변경 없음).

## 69. 뒤로가기 화살표 끝-테두리 간격을 상/좌 동일하게 보정

- 사용자 요청: "좋은데 화살표 좌측끝과 액션박스 좌측테두리 사이 거리와 화살표 상단끝과
  액션박스 상단테두리 사이거리가 같게 해줘".
- 원인 확인: 68에서 `.battle-move-back-btn`의 `top`/`left`를 똑같이 `7px`로 맞췄지만, 정작
  버튼 안에 그려지는 `left_arrow.png` 스프라이트 자체의 여백이 상/하와 좌/우가 다름 — 8개 프레임
  전부 세로 방향은 여백 0px(프레임 맨 위~맨 아래까지 화살표가 꽉 참)인 반면, 가로 방향은
  애니메이션 중 프레임마다 좌측 여백이 2~6px(스케일 반영, 평균 4px) 사이로 흔들림(좌우로 살짝
  움직이는 흔들림 애니메이션이라 매 프레임 위치가 다름). 그 결과 버튼 상자의 top/left 값은
  같아도, 실제로 보이는 화살표 끝과 테두리 사이 간격은 위쪽이 항상 더 좁아 보였음(픽셀 실측:
  위쪽 간격 약 5.4px 고정 vs 왼쪽 간격 7.4~11.4px로 프레임마다 변동, 평균 9.4px).
- 1차 시도: top을 11px로 올림(8프레임 평균 좌측 여백 4px 기준) — 중간 프레임에서는 9.4px로
  일치했으나, 사용자가 "가장 왼쪽으로 이동했을 때" 기준으로 다시 맞춰달라고 요청.
- 최종 수정: top을 9px로 재조정(가장 왼쪽으로 이동한 프레임 기준, 좌측 여백 2px) — 이 프레임에서
  위/좌 간격이 정확히 일치(약 7.4px). 단, 오른쪽으로 흔들릴수록 좌측 간격만 벌어지는 트레이드오프
  있음(사용자 확인 후 최종 적용).
- 검증: Python/PIL로 실제 렌더 배율로 합성한 이미지로 후보들(7px/11px/9px)을 육안 확인, 8프레임
  전체 픽셀 계산으로 최종 확정.

## 70. 더미 코드/충돌 코드 정리 및 주석 간결화

- 사용자 요청: "더 이상 쓰지 않는 더미 코드, 쓰레기 코드를 정리하고 충돌이 예상되는 코드나
  버그를 유발할 수 있는 코드를 정리하고 주석을 너무 장황하게 적지말고 핵심을 요약하여 정리하는
  최적화 패치를 계획해줘" — 이후 "패치 후 남아 있는 과거 주석들도 함께 정리해줘"로 범위 추가.
- 조사 결과: script.js/pokemon_learning.js/pokemon_pokedex.js/pokemon_catch.js/pokemon_battle.js/
  pokemon_battle_data.js 6개 로직 파일과 style.css 전수 스캔 결과, console.log 잔재·주석 처리된
  죽은 코드·미사용 함수·미사용 CSS 클래스/id(122개 전수 대조)·백업 파일·중복 HTML id·전역 스코프
  이름 충돌·addEventListener 중복 등록 전부 0건으로 확인됨 — 더미/충돌 코드 자체는 정리할 대상이
  없었음.
- 실제 작업: 4줄 이상 이어지는 주석 블록(6개 파일 총 62개)을 검토해 핵심 "왜"와 향후 실수 방지
  경고는 남기고 반복 서술을 줄여 37개로 축소. 그 과정에서 발견한 leftover 흔적도 함께 정리함:
  - script.js의 orphan 주석 "// 퀴즈 모달 요소"(코드는 이미 pokemon_learning.js로 이동했는데
    헤더만 남아있던 것) 삭제.
  - pokemon_battle.js에 남아있던 스테일 줄번호 참조("위 3408번째 줄 부근" — 현재 파일 구조와
    맞지 않는 예전 참조) 수정.
  - script.js에 실제 구현(JS 타이머 방식)과 어긋나게 남아있던 "CSS steps() 애니메이션으로
    재생함"이라는 stale 설명 수정(같은 파일 아래쪽엔 반대로 "steps() 방식은 버그가 있어 못 씀"
    이라는 설명이 남아있어 서로 모순이었음).
  - script.js/pokemon_pokedex.js/pokemon_catch.js/pokemon_battle.js 헤더 등 5곳에 남아있던
    "모듈화(v2)"·"N절 참고" 버전 인용 제거 — 패치 이력은 CHANGELOG.md/MODULARIZATION_PLAN.md에만
    남긴다는 기존 원칙(69번 이전 정리 작업)을 이후 새로 생긴 모듈화 파일에도 재적용함.
  - 코드 주석에 남아있던 "사용자 요청: ~" 식 mini 패치로그, "예전엔 ~였는데"·"한때 ~로 바꿨다가"
    식 변경 이력 서술, 이미 삭제된 죽은 코드에 대한 삭제 경위 설명을 현재 상태·이유 중심으로
    재작성함.
- 검증: 코드 로직·동작은 전혀 변경하지 않고 주석/공백만 수정(주석 내용의 사실관계는 위 stale
  설명 2건을 바로잡음). 6개 파일 전부 `node --check` 통과. 데이터 파일 4개
  (pokemon_data.js/pokemon_pokedex_form_data.js/pokemon_front_sprite_offsets_data.js/
  pokemon_back_sprite_offsets_data.js)는 손대지 않음(9-N 패턴 개수 변동 없음 확인).
- 결과: 6개 파일 합계 3752줄 → 3638줄, 4줄+ 연속 주석 블록 62개 → 37개.

## 71. 공격자 2타입 상성 계산을 "곱하기"에서 "더 유리한 쪽"으로 변경

- 사용자 요청: 무한다이맥스 무한다이노(독/드래곤) vs 지가르데(드래곤/땅) 상성을 실제 포켓몬
  기준과 비교하다가, "우리쪽 시스템도 유리한 기술을 우선하는 쪽으로 설계하는 게 좋을 것 같다"는
  방향에 합의 — "포켓몬이 2타입이면 두 타입을 동시에 곱하는 게 아닌, 두 타입 중 상대의 상성상
  더 높은 배수로 피해를 줄 수 있는 쪽으로 결정"해달라는 요청.
- 원인: 기존 `getAttackEffectiveness`는 공격자의 타입이 2개면 각 타입별 배율을 서로 곱해서
  최종 배율을 냈음. 실제 포켓몬은 기술 하나가 타입 하나만 가지므로 이런 곱연산 자체가 없는데,
  이 방식 때문에 지가르데(드래곤/땅)가 무한다이노(독/드래곤)를 공격하면 실제 게임 최대치인
  2배 대신 2×2=4배로 과장되어 계산되고 있었음. 반대로 공격자의 두 타입이 각각 반감(0.5배)이면
  0.5×0.5=0.25배까지 떨어지는 등, 어떤 단일 기술로도 나올 수 없는 값이 나오는 문제도 있었음.
- 수정: 공격자 타입별 배율(`getTypeEffectiveness`)을 곱하는 대신 `Math.max`로 그중 더 높은
  값 하나만 최종 배율로 씀(실제 대전에서 유리한 기술을 골라 쓰는 것과 동일한 효과). 방어자 쪽
  다중 타입 곱연산(`getTypeEffectiveness` 내부)은 실제 포켓몬 규칙 그대로라 변경하지 않음 —
  방어자가 한 타입에 이중 약점/이중 저항이면 4배·0.25배가 여전히 나올 수 있음(공격자가 아니라
  방어자 쪽 조건으로). AI 판단 로직(`pickAiAction`/`pickAiTurnAction`)과 데미지 멘트 5단계
  분기(`typeMult >= 4` 등)는 배율이 여전히 0/0.25/0.5/1/2/4 중 하나로 나와서 그대로 유효함(수정
  불필요).
- 검증: pokemon_battle_data.js의 실제 TYPE_CHART로 node에서 직접 계산 재현 — 지가르데→무한다이노
  4배(수정 전) → 2배(수정 후, 실제 포켓몬과 일치)로 확인. 그 외 케이스도 확인: 공격자 두 타입이
  각각 0.5배인 경우 0.25배(수정 전) → 0.5배(수정 후), 단일 타입 공격자는 값 불변, 방어자 이중
  약점 케이스(4배)는 수정 후에도 그대로 유지됨. `node --check pokemon_battle.js` 통과.

## 72. 1타입 포켓몬 공격 시 "단일 타입 보정" 배율 추가

- 사용자 요청: 71번 패치(공격자 2타입이면 더 유리한 쪽 배율 사용) 이후 "1타입 포켓몬이 2타입
  포켓몬보다 불리해지지 않았냐"는 질문에서 시작 — 실제 배틀(3마리 파티, 상대 타입을 모르는
  상태)을 시뮬레이션해보니 1타입 팀 승률 30% vs 2타입 팀 70%로 격차가 컸음. 보정안으로 "가중
  평균" 방식과 "자속보정을 1타입에만 적용" 방식을 비교 분석한 뒤 후자를 택해 "단일 타입 보정"
  이라는 이름으로 적용하기로 함.
- 원인: 71번 패치 이후 2타입 포켓몬은 자기 두 타입 중 더 유리한 쪽을 골라 쓸 수 있는 반면,
  1타입 포켓몬은 고를 게 없어 항상 자기 타입 하나로만 싸움. 이 게임은 모든 공격이 "자기 타입
  그대로"라 실제 포켓몬처럼 기술 커버리지로 약점을 보완할 수도 없어서, 이 차이가 그대로 승률
  격차로 드러남.
- 수정: `pokemon_battle.js`에 `SINGLE_TYPE_BONUS_MULT = 1.35` 상수를 추가하고,
  `getAttackEffectiveness`에서 공격자 타입이 1개일 때만 이 배율을 추가로 곱하도록 변경(2타입
  공격자의 `Math.max` 계산과 방어자 쪽 다중 타입 배율 계산은 그대로 둠).
- 배율(1.35) 산출 근거: 평균 상성 배율만 보면 1.3 정도로도 1타입/2타입 평균이 거의 같아졌지만,
  실제 3마리 파티 배틀 승률로는 그 값에서 아직 2타입 쪽이 근소 우세(48:52)했음. 승률 기준으로
  정확히 50:50에 맞는 값을 찾기 위해 배율을 1.25~1.45 구간에서 스캔해 1.35~1.36을 교차점으로
  특정함.
- 검증: 파티 내 1타입 포켓몬 개수(0~3마리) 기준으로 만들 수 있는 A/B팀 조합 16가지 전부에 대해
  각 15,000판씩 배틀 시뮬레이션(양쪽에 게임의 AI 행동 로직을 동일하게 적용해 타입 구성 자체의
  효과만 비교) — 모든 조합이 48.4%~50.9% 사이로 고르게 맞춰짐을 확인(패치 전 극단 케이스는
  30.0%/70.0%였음). `node --check pokemon_battle.js` 통과.
- 참고: 실제 포켓몬의 자속보정(모든 포켓몬에 대칭적으로 적용되는 1.5배 규칙)과는 다른, 이
  게임 전용 비대칭 밸런스 보정 계수임 — 그래서 이름도 "자속보정"이 아니라 "단일 타입 보정"으로
  붙임.

## 73. 데미지 효과 멘트가 단일 타입 보정 영향을 받지 않도록 순수 상성 기준으로 분리

- 사용자 확인: 실제 포켓몬 게임에서는 데미지 효과 멘트("효과가 굉장했다!" 등)가 자속보정·급소
  같은 부가 배율과 무관하게 순수 상성표 배율만으로 결정된다는 점을 확인 — 그런데 72번 패치의
  단일 타입 보정이 `getAttackEffectiveness`(멘트 판정에도 쓰이던 함수) 안에 섞여 들어가 있어서,
  1타입 포켓몬의 멘트가 순수 상성과 어긋나는 경우가 있었음(예: 상성 1배인 평범한 매치업인데
  보정 때문에 1.35배가 되어 "굉장했다!"가 뜨거나, 이중 저항 0.25배가 0.3375배가 되면서 "매우
  별로" 대신 "별로"로 등급이 약하게 표시됨).
- 수정: 단일 타입 보정을 적용하기 전의 "순수 상성 배율"만 계산하는 `getBaseTypeMultiplier`
  함수를 새로 분리하고, `getAttackEffectiveness`는 이 함수를 호출한 뒤 1타입일 때만 보정을
  곱하도록 재작성(데미지 계산 전용으로 남김). `resolveSingleAction`의 데미지 멘트 5단계 분기는
  `typeMult`(보정 포함) 대신 `getBaseTypeMultiplier`로 새로 구한 `baseMult`(순수 상성)를
  기준으로 판정하도록 변경. 실제 데미지 계산(`dmg = ... * typeMult * ...`)과 AI 판단 로직
  (`pickAiAction`/`pickAiTurnAction`)은 그대로 보정 포함 값을 씀(변경 없음).
- 검증: 실제 데이터로 경계 케이스 재현 — 1타입 NORMAL→GRASS(순수 상성 1배)는 수정 전 데미지용
  배율 1.35배 때문에 "굉장했다!"가 잘못 뜨던 것이 수정 후 순수 상성 1배로 판정되어 멘트 없음
  (평범)으로 정상화됨. 1타입 GRASS→[FIRE,DRAGON](이중 저항 0.25배)도 수정 전 0.3375배로 계산돼
  "별로"로 약하게 뜨던 것이 수정 후 순수 상성 0.25배로 "매우 별로"로 정상화됨. 두 경우 모두
  실제 데미지량(1.35배/0.3375배 반영)은 그대로 유지되는 것도 확인. 2타입 공격자는 애초에 보정이
  없어서 멘트 판정에 변화가 없음(동일 케이스로 확인). `node --check pokemon_battle.js` 통과.

## 74. 상대 포켓몬 이름표-hp바 간격이 내 쪽(3px)보다 1px 좁게(2px) 보이던 문제 수정

- 사용자 확인: 타입 아이콘과 hp바 사이 간격이 상대편이 내 편보다 미세하게 좁아 보인다는 지적으로
  시작 — 실제로 좌표를 재현해 브라우저에서 직접 렌더링·측정해보니 상대편은 2px, 내 편은 3px로
  확인됨.
- 원인: `WILD_INFO_NAME_BLOCK_HEIGHT = 23`이 "이름표 줄높이(20) + hp바 여백(3)"이라는 가정으로
  hp바 위치를 계산하는데, 실제 이름표 줄의 렌더링 높이는 텍스트 줄높이(20px)가 아니라 그 줄에
  같이 들어간 타입 뱃지 이미지 높이(21px)를 따라감(`align-items: center`인 flex 줄이라 가장 큰
  자식 기준으로 줄 높이가 정해짐). 이 1px 차이가, 이름표 줄을 위(top) 기준으로 고정하고 줄이
  아래로 자라는 상대편 쪽에서만 여백을 그대로 갉아먹어 2px로 보임(내 편은 hp바 바로 위 3px
  지점에 아래(bottom) 기준으로 고정하는 방식이라 줄 높이와 무관하게 항상 3px 유지됨).
- 검토한 수정 방법 두 가지: (1) `WILD_INFO_NAME_BLOCK_HEIGHT`를 24로 올려 hp바 자체를 1px
  내리는 방법(이 상수가 상대 포켓몬 스프라이트 위치 계산(`nominalHpBarBottom`)에도 쓰이고
  있어서, hp바와 스프라이트가 함께 1px 이동함 — 상대 간격은 유지되지만 이미 튜닝된 위치를
  건드리게 됨), (2) 이름표 줄 자신의 위치만 1px 올리는 방법(hp바·스프라이트 위치는 전혀 안
  건드림). 이미 59~61번 패치에서 공들여 맞춘 hp바-스프라이트 위치를 다시 흔들 필요가 없다고
  판단해 (2)번으로 결정.
- 수정: `WILD_INFO_TEXT_ROW_CORRECTION = 1` 상수를 새로 추가하고, `monsterInfoText.style.top`
  계산식에서 이 값만큼 추가로 뺌(`WILD_INFO_TOP - WILD_INFO_GAP - WILD_INFO_TEXT_ROW_CORRECTION`).
  `WILD_INFO_NAME_BLOCK_HEIGHT`·hp바·스프라이트 위치는 변경 없음.
- 검증: 실제 좌표값 그대로 재현해 브라우저 렌더링으로 재측정 — 이름표-hp바 간격이 정확히 3px로
  나와 내 편과 동일해진 것을 확인. `node --check pokemon_battle.js` 통과.

## 75. 배틀 중 교체 후보 목록이 긴 이름(다이맥스 등)에서 액션박스/화면 밖으로 삐져나오던 문제 수정

- 사용자 확인: "포켓몬" 버튼을 눌렀을 때 뜨는 교체 후보 이름+타입아이콘이 너무 길면 액션박스
  밖, 심하면 화면 밖까지 삐져나오는 경우가 있다는 지적으로 시작. 원인은 교체 후보(battleParty가
  항상 3마리 고정이라 나가있는 개체를 빼면 최대 2마리)를 `#battle-switch-inline-list`가 가로
  한 줄(`flex-direction: row`)에 나란히 배치하는데, 각 버튼도 이름+타입아이콘을 한 줄에
  묶어서(`white-space: nowrap`) 줄바꿈이 안 되다 보니, 거다이맥스/무한다이맥스처럼 이름이 긴
  폼 두 마리가 동시에 후보로 뜨면 두 버튼 폭 합이 액션박스 폭(340px, 뒤로가기 버튼 여백 제외
  실사용 가능폭 약 296px)을 넘어버림.
- 검토한 대안: (1) 가로 1줄은 유지하되 너무 긴 이름만 2줄로 줄바꿈하는 방법도 검토했으나,
  다이맥스가 아닌 메가 진화 이중타입 이름(7~8자)도 조합에 따라 이미 넘칠 수 있다는 게 실측으로
  확인돼(예: "거다이맥스 리자몽" + "메가한카리아스Z" 조합만으로도 이미 폭 초과) 이름 문자열
  기준으로 특별 취급하는 방식은 범위가 좁다고 판단해 제외. (2) 후보를 한 줄에 하나씩, 세로로
  쌓는 방법 — 후보 하나가 한 줄을 통째로 쓸 수 있어서 실제 로스터에서 가장 긴 이름(다이맥스
  이중타입, 이름+아이콘 2개 합쳐 약 226px)도 한 줄 예산(약 296px)에 여유 있게 들어감을 실측으로
  확인(웹폰트(NeoDunggeunmo) 그대로 렌더링해서 폭 측정). (2)번으로 결정.
- 터치 오조작 검토: 두 후보를 세로로 쌓으면 버튼 사이 간격이 좁아져 모바일에서 오조작 위험이
  늘어날 수 있다는 점을 미리 짚었음(이 게임은 `viewport` 메타 태그로 모바일 대응을 전제하고
  있고, `#game-frame`이 `BASE_WIDTH=370` 기준으로 화면 폭에 맞춰 스케일되므로 폰에서 버튼이
  극단적으로 작아지진 않지만, 애초에 버튼 높이 자체가 텍스트 줄높이(20px)뿐이라 여유가 크지
  않음). 액션박스 높이(약 66.5px)를 기존에는 한 줄만 쓰고 나머지를 여백으로 날리고 있던 걸
  버튼 위아래 패딩으로 돌려서, 두 후보 버튼의 실제 클릭 영역을 20px → 28px로 넓히고
  (2*28px + 줄 간격 4px = 60px, 액션박스 높이 안에 여유 있게 들어감) 오조작 가능성을 완화함.
- 사전 검증(구현 전): 실제 게임 리소스(`action_box.png`, `types_short.png`, 실제 폰트)를 그대로
  써서 가장 긴 이중타입 이름 2개("무한다이맥스 무한다이노", "거다이맥스 다태우지네")로 패치
  전/후 비교 렌더링을 만들어 사용자에게 미리 확인시킴 — 패치 전은 오버플로우 재현, 패치 후는
  세로 2줄로 문제없이 들어가는 것과 패딩 포함 클릭 영역을 시각적으로 확인.
- 수정: `style.css`에서 `#battle-move-list, #battle-switch-inline-list` 공유 규칙을 분리 —
  `#battle-move-list`(기술 4버튼 가로 배치)는 기존 그대로 유지하고, `#battle-switch-inline-list`
  는 `flex-direction: column; justify-content: center; align-items: center; gap: 4px`로 새로
  분리. `.battle-switch-inline-btn`에는 `padding: 4px 0`을 추가(클릭 영역 확장, 이름+타입아이콘
  내부 가로 배치 자체는 변경 없음). JS(`pokemon_battle.js`)는 변경 없음 — 후보 렌더링 로직이
  DOM에 순서대로 append만 하는 구조라 CSS만으로 세로 배치가 적용됨.
- 검증: 실제 데이터(가장 긴 이중타입 이름 2개 동시 후보)로 브라우저 렌더링 재현 — 액션박스/화면
  밖으로 넘치던 현상이 해소되고 두 버튼이 세로로 깔끔하게 들어감을 확인. 기술 메뉴
  (`#battle-move-list`)는 선택자 분리 후에도 기존 가로 4버튼 배치 그대로 유지되는 것 확인.
  `node --check pokemon_battle.js` 통과(JS 무변경이라 참고용).

## 76. 기절 멘트가 쓰러지는 연출보다 먼저 뜨던 순서를 수정

- 사용자 확인: 기절 멘트("OOO이(가) 쓰러졌다!")가 뜨는 타이밍이 이상하다는 지적으로 시작. 실제
  코드를 보니 `handleFaint()`가 멘트를 먼저 띄우고(타이핑+대기 `BATTLE_MESSAGE_HOLD=650ms`,
  글자당 `BATTLE_MESSAGE_CHAR_DELAY=42ms`라 이름 길이에 따라 총 1초 안팎) 그게 다 끝난 뒤에야
  쓰러지는(가라앉는) 연출(`playAiFaintAnimation`/`playPlayerFaintAnimation`, 300~900ms)을
  재생하고 있었음 — 포켓몬은 멀쩡히 서 있는데 "쓰러졌다!"는 멘트만 먼저 뜨고 한참 있다가 뒤늦게
  쓰러지는 것처럼 보이는 문제였음.
- 다른 배틀 이벤트들과 비교 점검: 진행 전에 이런 순서 문제가 다른 곳에도 있는지 전수 확인함 —
  공격(멘트 → hp 애니메이션 → 상성 멘트), 회복(멘트 → hp 애니메이션 → 성공 멘트), 교체(멘트 →
  등장 애니메이션), 승패 결과(멘트 → 결과 화면 전환)는 전부 "먼저 선언 멘트가 뜨고 그 결과가
  일어나는" 순서로 실제 포켓몬 게임과 이미 일치함(회복은 이전 패치에서 hp 애니메이션이 멘트보다
  먼저 오도록 이미 맞춰져 있었음). 기절만 실제 게임에서 예외적으로 "연출이 먼저 끝난 뒤에 멘트가
  뜨는" 반대 순서인데, 코드는 이 예외를 반영하지 못하고 다른 경우와 같은 패턴(멘트 먼저)을
  그대로 적용하고 있어서 이 한 곳만 어긋나 있었음을 확인.
- 수정: `handleFaint()`에서 `showBattleMessage(...)` 안에 연출 재생을 넣는 구조를, 연출
  (`playAiFaintAnimation`/`playPlayerFaintAnimation`)을 먼저 재생하고 그 완료 콜백에서
  `showBattleMessage`로 멘트를 띄우도록 순서를 뒤집음. 멘트 완료 후 실행되던 전멸 판정/자동
  교체/강제 교체 로직(`afterVisual`)은 그대로 멘트 뒤에 실행되도록 유지 — 상태 갱신·다음 진행
  순서 자체는 변경 없음.
- 검증: `node --check pokemon_battle.js` 통과. 코드 흐름 재확인 — 연출 재생 중에는 이전 단계
  멘트(공격 선언/상성 멘트)가 대화창에 그대로 남아있다가 연출이 끝나면 "쓰러졌다!" 멘트로
  바뀌는데, 이는 실제 게임에서도 상성 멘트가 화면에 남아있는 채로 쓰러지는 연출이 재생되는
  것과 동일한 모습이라 위화감 없음을 확인.

## 77. 물리/특수 공격 통합("공격") + 명중률/치명타 도입

- 배경: 지금은 능력치(공/방/특공/특방/스피드)가 없어서 물리와 특수가 데미지 공식(고정 기준값 ×
  타입 상성 배율 × 랭크업 배율)이 완전히 동일하고 라벨만 다른 상태였음. 종족치가 아직 없는
  동안은 굳이 둘을 나눠둘 이유가 없어 "공격" 하나로 통합하기로 함(나중에 종족치가 추가되면
  물리/특수를 다시 분리할지는 그때 재검토하기로 함 — 사용자 확인 완료). 겸사겸사 실제 포켓몬의
  명중률(빗나감)과 치명타 요소도 단순화해서 같이 도입함.
- 실제 게임 멘트 대조: 진행 전에 새로 쓸 멘트가 실제 포켓몬 게임과 같은지 확인함 — "급소에
  맞았다!"(치명타)는 나무위키·포켓몬 Fandom 한국어판 등에서 동일 문구로 확인됨. 빗나감 멘트는
  정확한 공식 문구를 확신하지 못해(참고 자료마다 표현이 조금씩 다름) 사용자가 직접
  "OOO에게는 맞지 않았다!"로 확정해줌(기존 "효과가 없는 것 같다" 멘트와 동일한 이름 표기 방식 —
  상대 포켓몬이면 "상대 OOO", 내 포켓몬이면 접두사 없음 — 재사용).
- 물리/특수 통합: `BATTLE_ACTIONS`를 4개(물리/특수/랭크업/회복)에서 3개(공격/랭크업/회복)로
  줄이고, `pickAiAction()`의 `physical`/`special` 무작위 선택을 `'attack'` 고정 반환으로 단순화.
  `resolveSingleAction()`의 `actionLabel`(물리/특수 분기) 변수를 제거하고 "공격"으로 고정.
  관련 주석을 `pokemon_battle.js`/`index.html`/`style.css`/`pokemon_battle_data.js` 전체에서
  같이 정리(4개→3개, 물리/특수 언급 제거).
- 명중률 도입: `BATTLE_ACCURACY = 0.95` 추가. "OOO의 공격!" 선언 멘트 직후 명중 판정을 하고,
  빗나가면 "OOO에게는 맞지 않았다!" 멘트만 띄우고 데미지 계산 자체를 건너뛴 채 턴을 넘김.
  랭크업/회복은 자기 자신 대상이라 실제 게임처럼 명중 판정을 적용하지 않음.
- 치명타 도입: `BATTLE_CRIT_CHANCE = 0.05`, `BATTLE_CRIT_MULT = 2` 추가. 명중 판정을 통과하면
  데미지 계산 시 상성이 면역(0배)이 아닌 경우에만 치명타 여부를 굴려서(면역이면 데미지가
  0이라 실제 게임처럼 아예 안 굴림) 데미지에 배율을 곱하고, hp 애니메이션이 끝난 뒤 상성
  멘트보다 먼저 "급소에 맞았다!"를 띄움(실제 게임 순서와 동일). 상성 멘트 판정(`baseMult`
  기준)은 이전과 동일하게 치명타·단일 타입 보정이 섞이지 않은 순수 상성만 봄.
- 검증: `node --check` 전체 통과. 코드 흐름으로 빗나감/일반 히트/치명타/면역+치명타 미굴림 네
  경우 각각의 멘트·데미지 순서를 재확인. 명중률/치명타는 양쪽(나·상대) 공격에 동일하게
  적용되므로 기존 "단일 타입 보정"(1.35배)의 상대적 밸런스에는 영향이 없을 것으로 판단(필요
  시 추후 시뮬레이션으로 재검증 예정).

## 78. 폼별로 타입이 바뀌는 포켓몬들이 전부 기본폼 타입으로 고정되어 있던 데이터 버그 전수 수정

- 사용자 지적: "아르세우스, 캐스퐁 같은 포켓몬이 모두 노말타입으로 되어있는 문제가 있어
  확인해봐" — 이후 수정 범위를 묻는 질문에 "전체 데이터 전수조사"로 답해 아르세우스/캐스퐁
  2종에 그치지 않고 `pokemon_data.js` 전체를 대상으로 같은 패턴을 찾아 고치기로 함.
- 원인: `pokemon_data.js`는 포켓몬을 폼 단위 키(`"493"`, `"493-1"` 등)로 저장하고 각 키마다
  독립된 `types` 필드를 갖는 구조라 폼별 타입 저장 자체는 문제없는데, 실제 게임에서 폼에 따라
  타입이 바뀌는 종들 중 다수가 모든 폼 키에 기본폼 `types` 값을 그대로 복붙해놓은 데이터
  오류였음. 렌더링(`script.js`의 `renderTypeBadges()`)과 배틀 상성 계산
  (`pokemon_battle.js`의 `getAttackEffectiveness()`/`getTypeEffectiveness()`)은 이미 폼 키
  단위로 `POKEMON_DATA[id].types`를 정확히 읽고 있어서 로직 코드에는 문제가 없었고, 데이터만
  틀려 있었음.
- 조사 방법: `category:"normal"`이고 같은 species에 폼이 2개 이상이며(성별 전용 `-female`
  폼은 제외) 전 폼의 `types`가 동일한 species 그룹을 스캔하는 read-only 스크립트를 작성해
  124개 후보 그룹을 뽑음. 각 후보의 폼 이름표(`pokemon_pokedex_form_data.js`의
  `DEX_FORM_NAME_OVERRIDES`)로 정확히 어떤 실제 변형(알로라/가라르/히스이/팔데아/전용 폼명
  등)인지 확정한 뒤, PokeAPI(`pokeapi.co`)로 실제 게임 타입을 교차검증해서 진짜 버그와 정상
  케이스(색깔/무늬/성별/자세 변경처럼 실제로 타입이 안 바뀌는 폼)를 구분함. `category:"mega"`/
  `"gmax"` 폼은 스팟체크(갸라도스/전룡/캥카/번치코/보스로라/다크펫) 결과 이미 정확한 것으로
  확인되어 조사 대상에서 제외함.
- 결과: 124개 후보 중 66개 species(폼 113개)가 실제 버그로 확인되어 수정함 — 알로라/가라르/
  히스이/팔데아 리전폼 전반(예: 라이츄·모래두지·식스테일·야돈·마임맨·전설새 3종·코산호 등),
  배틀/특수폼(아르세우스 18폼, 캐스퐁 3폼, 실버디 17폼, 오리코리오 3폼, 도롱마담 2폼,
  네크로즈마 3폼, 자시안/자마젠타 각 1폼, 후파 1폼, 켄타로스 팔데아 3품종, 불비달마
  3폼, 우라오스 연격 태세, 버드렉스 라이더 2폼, 오거폰 가면 3종 등)이 대상. 나머지 58개
  species는 PokeAPI 대조 결과 실제로 타입이 안 바뀌는 정상 케이스(피카츄 코스튬, 안농,
  체리꼬, 로토무, 기라티나, 케르디오, 비비용, 마휘핑 등)로 확인되어 그대로 둠.
- 수정 파일: `pokemon_data.js`의 `"types"` 필드만 변경(113개 폼 키). `name`/`bst`/`category`/
  `species` 등 다른 필드와 로직 파일(`script.js`/`pokemon_catch.js`/`pokemon_battle.js`/
  `pokemon_pokedex.js`)은 변경하지 않음.
- 검증: `node --check pokemon_data.js` 통과. 수정 전/후로 동일한 스캔 스크립트를 재실행해
  수정된 66개 species가 "전 폼 동일 types" 목록에서 사라지고(폼별로 달라졌으므로), 정상
  케이스 58개는 그대로 남아있음을 확인. 아르세우스/캐스퐁/실버디/오거폰 등 대표 종은 수정된
  `types` 값을 직접 출력해 PokeAPI 데이터와 일치하는지 재확인. 브라우저 실동작(도감 폼별 타입
  뱃지, 배틀 상성 계산)은 `file://` 특성상 Claude가 직접 확인할 수 없어 사용자가 새로고침 후
  직접 확인 필요.

## 79. 배틀 화면에서 스프라이트 애니메이션 재생 중 hp바와의 간격이 5px 밑으로 내려가던 문제 수정

- 사용자 지적: "이게 스프라이트 이미지를 재생하다보니 hpbar와의 간격이 5px이 안되는 경우가
  있거든" — 배틀 화면의 상대(앞모습)·내 포켓몬(뒷모습) 위치 계산이 각 스프라이트시트의 0번
  프레임(정지 포즈)만 실측한 값을 쓴다는 걸 먼저 확인한 뒤 지적한 것.
- 원인: `alignWildMonsterTopToHpBar()`(상대)와 `displayBackSprite()`의 박스 위치 계산(내
  포켓몬)이 `pokemon_front_sprite_offsets_data.js`/`pokemon_back_sprite_offsets_data.js`에
  저장된 0번 프레임 실측값(`h`/`shinyH`)만으로 스프라이트 박스 위치를 한 번 계산한 뒤 고정하는데,
  실제 재생되는 스프라이트시트는 프레임마다(예: 이상해씨 앞모습 49프레임) 그림의 투명 여백이
  다름. 수학적으로 유도하면 "프레임 i의 실제 hp바 간격 = 5px + (프레임 i의 여백 − 0번 프레임의
  여백) × 표시배율"이 되어, 0번 프레임보다 그림이 더 튀어나온 프레임이 재생되면 간격이 5px보다
  좁아지거나 심하면 음수(겹침)까지 나옴 — 이상해씨로 실측(Python/Pillow) 확인: 상단여백이
  0px(46번 프레임)~10px(0번 프레임 5px 대비)까지 흔들려 실제 간격이 약 -5.3px까지 떨어짐. 이
  편차는 0번 프레임의 `h`/`y`(중심 보정)와 무관하고 오직 프레임별 여백 차이에만 좌우됨(수식상
  중심 보정값이 상쇄됨).
- 수정 방향(사용자 확정: "항상 최소 5px 보장", 상대·내 포켓몬 둘 다 적용): 기존 `x/y/w/h`류
  필드는 다른 용도(표시 크기 보정, 샤이니 이펙트 등)에도 쓰여서 그대로 두고, 위치 계산 전용
  안전 여백 필드만 새로 추가함.
  - `pokemon_front_sprite_offsets_data.js`: 모든 항목에 `topSafety`/`shinyTopSafety` 추가
    (Python/Pillow로 전체 재생성 — 각 스프라이트시트의 **전체 프레임**을 `script.js`의 런타임
    프레임 분할 규칙과 동일하게 나눠 상단 여백을 측정하고, `0번 프레임 여백 − 전체 프레임 중
    최소 여백`을 저장. 정지 이미지는 자동으로 0).
  - `pokemon_back_sprite_offsets_data.js`: 모든 항목에 `bottomSafety` 추가(동일 방식, 하단
    여백 기준).
  - `alignWildMonsterTopToHpBar()`: `monster.style.top` 계산에 `topSafety * pixelScale`을
    더해 박스를 hp바 반대 방향으로 추가로 밀어냄.
  - `displayBackSprite()`: `boxEl.style.top` 계산에서 `bottomSafety * pixelScale`을 빼서
    박스를 정보블록 반대 방향으로 추가로 밀어냄.
- 검증: 재생성 전/후로 기존 `x/y/w/h`/`shinyX/Y/W/H` 값이 1591개(앞모습)·3182개(뒷모습) 항목
  전부 단 하나도 안 바뀌었는지 diff로 확인(새 필드만 추가됨). 이상해씨(1번)·806번·963번(큰
  여백 편차 종) 등 표본 여러 개를 재측정해 "새 안전 여백을 적용했을 때 전체 프레임 중 최악의
  실제 간격"을 재계산 — 전부 정확히 5px로 나옴을 확인(그 밖의 프레임은 5px 이상). `node --check`
  개별 파일 3종 + 전체 로드 순서 결합 검증 모두 통과. 브라우저 실동작(배틀 프리뷰에서 애니메이션
  재생 중 hp바와 안 겹치는지, 샤이니 이펙트·기절 연출 위치가 정상인지)은 `file://` 특성상
  Claude가 직접 확인할 수 없어 사용자가 새로고침 후 직접 확인 필요.

## 80. AI 트레이너가 기절 후 강제 교체할 때 상성을 무시하고 아무 포켓몬이나 내보내던 문제 수정

- 사용자 지적: "AI 트레이너가 포켓몬을 교체할 때 전장에 있는 내 포켓몬을 상대하기 수월한(상성상)
  포켓몬으로 내보내야하는게 맞는거 같은데 종종 게임을 하다 보면 포켓몬이 기절하고 나서 내보낸
  포켓몬이 전장에 있는 내 포켓몬과 상성이 안좋아서 바로 교체하는 경우가 있는거 같거든 한번
  확인해봐".
- 조사: AI가 포켓몬을 바꾸는 지점은 두 곳(기절 후 강제 교체 `autoSwitchAiNext()`, 기절 안 한
  상태에서의 자진 교체 `pickAiTurnAction()`)인데, 원인은 전자 하나였음. `autoSwitchAiNext()`가
  `aiParty.findIndex(p => !p.fainted)`로 **배열 순서상 첫 생존 개체를 상성과 무관하게 그냥
  내보내고 있었음** — `aiParty`(3마리) 자체가 `pickAiTeam()`에서 완전 무작위 순서로 편성되므로
  사실상 랜덤 선택이었음. 반면 `pickAiTurnAction()`은 "현재보다 상성이 엄격히 더 좋을 때만
  교체"하도록 이미 올바르게 짜여 있어서 버그가 없었음(교체 대상은 항상 현재 이상으로 보장,
  직접 코드 추적으로 확인).
- 이 인과관계 때문에 기절 후 나쁜 상성으로 등장 → 바로 그 다음 AI 턴에 `pickAiTurnAction()`이
  "상성 나쁘네" 판단해서 다시 교체 시도(그마저도 50% 확률로만) → 사용자가 겪은 "기절 직후
  바로 재교체되는" 부자연스러운 흐름이 만들어지고 있었음.
- 수정: `autoSwitchAiNext()`를 생존 개체 전체를 훑어 상대(플레이어 현재 포켓몬,
  `selectedBattleId` 기준) 상성 배율(`getAttackEffectiveness`)이 가장 높은 개체를 **확정적으로**
  선택하도록 변경. "그냥 나가있기"라는 선택지 자체가 없는 강제 상황이라 확률 게이트는 두지 않음.
  ```js
  function autoSwitchAiNext(onDone) {
      const playerTypes = (POKEMON_DATA[selectedBattleId] || {}).types || [];
      let bestIdx = -1, bestMult = -Infinity;
      aiParty.forEach((p, idx) => {
          if (p.fainted) return;
          const info = POKEMON_DATA[p.id] || {};
          const mult = getAttackEffectiveness(info.types || [], playerTypes);
          if (mult > bestMult) { bestMult = mult; bestIdx = idx; }
      });
      switchAiToIndex(bestIdx, onDone);
  }
  ```
- 범위 결정: 자진 교체(`pickAiTurnAction()`)를 더 적극적으로 만드는 방안(트리거를 1배 이하로
  완화, 1배 이상 후보는 최적화 없이 즉시 채택, 후보가 전부 1배 미만이어도 그중 최선으로 교체)도
  함께 논의했으나, 이는 버그 수정이 아니라 별개의 AI 행동 변경이고 "동등한 상성에도 매번
  들락날락", "현재가 후보들보다 나은데도 교체해버리는" 부작용이 있어 이번엔 보류하고 강제 교체
  수정만으로 범위를 확정함(사용자 확인) — 강제 교체가 이제 항상 "생존 개체 중 최고 상성"을
  내보내므로, 정의상 `pickAiTurnAction()`이 그보다 나은 후보를 찾을 수 없어 재교체를 시도하지
  않게 되어 원래 증상은 이 수정만으로 해소됨.
- 검증: `node --check pokemon_battle.js` 통과. 코드 흐름 재확인 — 기절 → `autoSwitchAiNext()`가
  생존 개체 중 상대 상성 최고를 확정 선택 → 이어지는 AI 턴에서 `pickAiTurnAction()`이 재교체를
  시도하지 않는 인과관계를 논리적으로 재검증. 브라우저 실동작(기절 후 나오는 포켓몬이 상성 좋은
  쪽인지, 그 직후 바로 재교체가 안 일어나는지)은 `file://` 특성상 Claude가 직접 확인할 수 없어
  사용자가 실제 배틀에서 확인 필요.

## 81. 포켓몬 캐치 게임 CP(종족값) 데이터 전수 검증 및 16개 폼 수정

- 배경: 배틀 게임에 종족치(공/방/특공/특방/스피드)를 도입하기 전 단계로, 캐치 게임이 이미
  갖고 있는 `bst`(CP) 데이터를 배틀 게임과 공유할 계획을 세움. 공유하기 전에 먼저 "캐치의
  CP데이터를 분석해서 실제 포켓몬 공식 API와 비교하여 정리 및 분석부터 먼저해줘"라는 사용자
  요청에 따라 검증부터 진행함.
- 방법: 라이브 API(pokeapi.co)는 이 작업 환경의 네트워크 정책상 직접 호출이 막혀 있어서,
  PokeAPI가 실제로 생성되는 원본 CSV 데이터(github.com/PokeAPI/pokeapi의
  `data/v2/csv/pokemon.csv`, `pokemon_stats.csv` 등)를 직접 받아 대조함. `pokemon_data.js`의
  전체 1,591개 키를 `category`별로 나눠서 검증: `mega`(95개)·`gmax`(34개)는 코드 주석에
  적힌 자체 공식(메가 bst = 기본 bst×2+200, 거다이맥스 bst = 기본 bst×3)이 실제로 전수
  일치하는지 확인(둘 다 예외 0건 — 실제 공식 스탯이 아니라 의도된 자체 CP 공식이므로 정상).
  `normal`(1,462개)은 각 폼을 PokeAPI의 정확한 폼(예: darmanitan-galar-zen, zacian-crowned
  등)에 매칭해서 실제 6개 스탯(HP/공격/방어/특공/특방/스피드) 합계와 1:1 대조 — 909개는 종에
  폼이 하나뿐이라 자동 매칭, 71개는 폼 이름표(알로라/가라르/히스이/팔데아)로 자동 매칭, 나머지
  51개(아르세우스·네크로즈마·자시안 등 폼이 많거나 특수한 전설/신화/기믹 포켓몬)는 하나하나
  직접 대조. 1,462개 전부 확인 완료.
- 결과: 16개 폼에서 실제 공식 스탯 합계와 불일치 발견.
  - 메테노(774) 코어 폼 6개(774-2~774-7, 주황/노랑/초록/옥색/파랑/보라) — 각성 후 "코어" 폼인데
    각성 전 "유성" 폼 값(440)이 그대로 남아있었음(빨간색 코어 774-1만 500으로 올바르게 반영돼
    있었음). patch78의 타입 버그와 같은 "폼별 값 전수 복사 누락" 패턴.
  - 불비달마 가라르 달마모드(555-3) — 다른 폼 값(480)이 복사돼 있었음. 실제 540.
  - 개굴닌자 지우(658-1) — 일반 개굴닌자 값(530)이 그대로 남아있었음. 실제(Ash-Greninja) 640.
  - 자시안 기본형/검왕(888/888-1), 자마젠타 기본형/방패왕(889/889-1) — 각 670/720으로 돼 있었는데,
    이는 오타가 아니라 8세대(소드실드) 출시 당시의 공식 스탯이었음. 9세대(스칼렛바이올렛)에서
    게임프리크가 공격 스탯을 실제로 하향 조정해 현재 공식 스탯은 660/700(pokemondb.net으로 재교차
    확인). 이 게임이 9세대까지 데이터를 다루므로 현재 기준 값으로 맞춤.
  - 비나방(284) 414→454, 크레세리아(488) 600→580, 판짱(674) 358→348, 거북손데스(689) 487→500 —
    다른 폼과 무관한 개별 단일폼이라 뚜렷한 원인 패턴 없이 단순 입력 실수로 추정.
  - 연쇄 수정: 거북손데스(689) 기본 bst가 487→500으로 바뀌면서 메가 공식(기본×2+200)을 그대로
    적용해야 하는 `689-mega`(메가거북손데스)의 값도 1174→1200으로 같이 갱신(공식 불일치 방지).
    개굴닌자는 기본형(658, 530) 자체는 안 바뀌고 지우 폼(658-1)만 바뀌어서 `658-mega`(공식
    기준값 530 그대로)는 영향 없음.
- 수정 파일: `pokemon_data.js`의 `"bst"` 필드만 변경(17개 키: 위 16개 + 연쇄 수정 1개).
  `name`/`category`/`species`/`types` 등 다른 필드는 변경하지 않음.
- 검증: `node --check pokemon_data.js` 통과. 수정 후 재검증 스크립트로 대상 17개 값이 모두
  의도한 값으로 반영됐는지 재확인하고, `mega`/`gmax` 129개 전체의 자체 공식(×2+200, ×3)
  일치 여부도 재확인해서 이번 수정으로 깨진 곳이 없음을 확인. 이 `bst`는 캐치 게임의 CP 표시와
  포획 확률(`getCatchProbability`, `pokemon_catch.js`) 계산에 쓰이므로, 이 16종/폼은 CP 수치와
  포획 난이도가 소폭 바뀜. 브라우저 실동작(캐치 화면 CP 표시, 포획 확률 체감)은 `file://` 특성상
  Claude가 직접 확인할 수 없어 사용자가 실제 플레이에서 확인 필요.

## 82. 메가/거다이맥스 bst 저장 방식 개편 — "진짜 종족값 저장 + CP 배율은 표시 시점에만 적용"

- 배경: 패치81에서 메가(bst=기본×2+200)·거다이맥스(bst=기본×3) 공식이 왜 하필 그 수식인지
  물어보다가, 사용자가 "종족치 보정(점수용)을 이로치 1.5, 메가 2, 거다이맥스 3배로 각각
  설정해줘 이건 종족값을 그렇게 기록하는 게 아닌 점수 표시용 배수만 그렇게 설정하라는 거지"라고
  요청함 — 기존처럼 `pokemon_data.js`에 이미 배율이 곱해진 값을 저장하는 대신, 이로치와 완전히
  같은 방식(원본 종족값은 그대로 두고 CP 계산 시점에만 배율을 곱함)으로 통일하는 개편.
- 구현:
  - `pokemon_data.js`: mega(95개)·gmax(34개) 전체의 `"bst"`를 자기 기본종(`species` 필드가
    가리키는 `normal` 카테고리 항목)의 `bst`와 정확히 동일한 값으로 변경(기존 배율 제거).
    예: `6-mega_x`(메가리자몽X) 1268 → 534(=리자몽 기본값과 동일), `689-mega` 1200 → 500.
    관련 주석 갱신 — 파일 상단에 "bst는 mega/gmax도 예외 없이 기본종과 항상 동일한 값"이라는
    설명 추가, 메가진화 확장 섹션의 "메가bst = 기본bst × 2 + 200" 공식 설명 삭제.
  - `pokemon_catch.js`: `MEGA_CP_MULTIPLIER = 2`, `GMAX_CP_MULTIPLIER = 3` 상수를 기존
    `SHINY_CP_MULTIPLIER = 1.5`와 나란히 추가하고, 카테고리 배율×이로치 배율을 곱해 최종 CP
    배율을 구하는 공용 함수 `getCpMultiplier(category, isShiny)`를 신설. `pickRandomMonster()`의
    `effectiveBst` 계산을 `info.bst * getCpMultiplier(category, isShiny)`로 교체(이로치 메가/
    거다이맥스는 두 배율이 곱연산으로 같이 적용됨 — 예: 이로치 메가리자몽X는 534×2×1.5=1602).
  - `pokemon_battle.js`: 배틀 파티용 표시 객체를 만드는 `partyEntryToMonsterObj()`도 같은 공식을
    중복 구현하고 있었어서(현재는 배틀 화면에 CP를 안 보여줘서 실제로는 안 쓰이는 값이지만,
    포획 게임과 로직이 어긋나 있으면 나중에 혼란의 소지가 있어 같이 정리함) `getCpMultiplier()`
    호출로 교체해 단일 소스로 통일.
  - 포획 확률(`getCatchProbability`)·실패 모션(`pickFailType`)은 원래부터 `currentBst`(원본
    종족값, 배율 미적용)만 쓰고 메가/거다이맥스는 애초에 고정 10%라 이번 변경의 영향 없음.
- 검증: `node --check`로 9개 js 파일 전수 통과. 수정 후 재검증 스크립트로 mega/gmax 129개
  전체의 `bst`가 각자 기본종의 `bst`와 정확히 일치하는지 재확인(0건 불일치). `SHINY_CP_MULTIPLIER`
  직접 참조가 `pokemon_catch.js`의 `getCpMultiplier()` 내부 한 곳으로만 남았는지, 그 외 파일은
  전부 `getCpMultiplier()`를 통해서만 배율을 쓰는지 grep으로 재확인.

## 83. 메가진화 원본 48종 bst를 실제 공식 종족값으로 재수정

- 배경: 패치82에서 메가(95개)·거다이맥스(34개) 전체의 `bst`를 예외 없이 "자기 기본종과
  동일한 값"으로 통일했는데, 사용자가 "메가리자몽 X는 534 아니라 634 아니야?"라고 지적함.
  확인해보니 6/7세대에 실존하는 정식 메가진화 48종(예: 메가리자몽X 실제 종족값 634, 기본
  리자몽 534와 다름)은 패치82처럼 기본종과 동일하게 두면 틀림 — 진짜 공식 종족값을 각각
  따로 저장해야 했음. 반면 2026-08 "메가진화 확장" 패치로 추가된 신규 47종(예: 메가라이츄,
  메가픽시 등)은 실제 포켓몬 공식에 아예 존재하지 않는 가상 메가라서 참조할 실제 종족값이
  없고, 거다이맥스 34종도 실제 게임에서 스탯이 안 오르므로 패치82의 "기본종과 동일" 처리가
  이미 맞았음 — 이 두 그룹은 이번에 손대지 않음.
- 원인 분석: `pokemon_data.js` 1567번째 줄 `// ===== 메가진화 확장 (2026-08 패치, 47개 신규) =====`
  주석 위(더 앞)에 위치한 48개 항목(3-mega, 6-mega_x, 6-mega_y, 9-mega, 15-mega, 18-mega,
  65-mega, 80-mega, 94-mega, 115-mega, 127-mega, 130-mega, 142-mega, 150-mega_x, 150-mega_y,
  181-mega, 208-mega, 212-mega, 214-mega, 229-mega, 248-mega, 254-mega, 257-mega, 260-mega,
  282-mega, 302-mega, 303-mega, 306-mega, 308-mega, 310-mega, 319-mega, 323-mega, 334-mega,
  354-mega, 359-mega, 362-mega, 373-mega, 376-mega, 380-mega, 381-mega, 384-mega, 428-mega,
  445-mega, 448-mega, 460-mega, 475-mega, 531-mega, 719-mega)이 바로 그 실존 원본 48종에
  해당함(이상해꽃/리자몽X·Y/거북왕/독침붕/피죤투/후딘/야도란/팬텀/캥카/쁘사이저/갸라도스/
  프테라/뮤츠X·Y/전룡/강철톤/핫삼/헤라크로스/헬가/마기라스/나무킹/번치코/대짱이/가디안/
  깜까미/입치트/보스로라/요가램/썬더볼트/샤크니아/폭타/파비코리/다크펫/앱솔/얼음귀신/
  보만다/메타그로스/라티아스/라티오스/레쿠쟈/이어롭/한카리아스/루카리오/눈설왕/엘레이드/
  다부니/디안시 — 6·7세대 공식 메가진화 전 종).
- 조치: PokeAPI 원본 CSV(패치81과 동일 출처, github.com/PokeAPI/pokeapi)에서 이 48종 각각의
  `-mega`/`-mega-x`/`-mega-y` 폼 실제 종족값 합계를 조회해서 `pokemon_data.js`의 해당 48개
  항목 `bst`를 전부 실제 공식 값으로 교체(예: `6-mega_x` 534 → 634, `6-mega_y` 534 → 634,
  `150-mega_x`/`150-mega_y`(뮤츠X/Y) 680 → 780, `384-mega`(레쿠쟈) 680 → 780). 파일 상단 주석과
  "메가진화 확장" 섹션 주석도 "오리지널 48종은 실제 공식 종족값을 그대로 저장, 신규 47종과
  gmax 전부는 참조할 실제 값이 없거나(신규 메가) 스탯 변화가 없어서(gmax) 기본종과 동일값
  유지"로 정확하게 갱신.
- 검증: `node --check pokemon_data.js` 통과. 수정 후 재검증 스크립트로 (1) 원본 48종 48/48
  전부 의도한 실제 공식 값과 정확히 일치, (2) 신규 47종 전부와 gmax 34종 전부는 여전히
  자기 기본종 `bst`와 정확히 동일(기존 상태 유지, 회귀 없음)을 확인. `getCpMultiplier()`는
  카테고리·이로치 여부로만 배율을 정하고 저장된 bst 값 자체엔 의존하지 않는 구조라 패치82의
  CP 배율 로직(`pokemon_catch.js`/`pokemon_battle.js`)은 수정 없이 그대로 정상 동작(포획 확률도
  메가/거다이맥스는 원래부터 고정 10%라 이번 수정으로 게임 난이도에 미치는 영향 없음, 화면에
  표시되는 CP 점수만 정확한 값으로 바뀜). 브라우저에서 메가리자몽X 등을 포획해 CP 표시가
  실제로 634×배율로 뜨는지는 사용자 확인 필요(파일 기반 페이지라 직접 브라우저 테스트 불가).

## 84. 배틀 게임 데미지 계산에 종족치(bst) 기반 보너스 반영 — 첫 번째 종족치 공유 단계

- 배경: 패치81~83에서 캐치 게임의 CP(종족값) 데이터를 정리·검증한 뒤, 이 데이터를 배틀 게임에
  공유하는 작업을 시작함. 사용자 요청: "배틀쪽 종족치는 배수 적용 안된 원래수치를 쓸거야 그리고
  포획률 쪽을 반영해서 기본 데미지인 20에 1~15를 더할 거거든 더할떄 (175→+1, 500→+5, 770→+10를
  지나도록 피팅된 지수함수)를 사용하고 메가와 거다이 맥스는 +15를 해". 공/방/특공/특방/스피드
  개별 능력치 반영은 아직 아니고, 종족치 총합(bst) 하나로 먼저 데미지에 강弱를 반영하는 1단계 개편.
- 구현: `pokemon_battle.js`에 캐치 확률 공식(`pokemon_catch.js`의 `CATCH_EXP_A/K/C`,
  `getCatchProbability`)과 완전히 같은 구조로 새 상수·함수를 추가함.
  - `BATTLE_DMG_BONUS_A = 5.539371444888705`, `BATTLE_DMG_BONUS_K = -0.001381995458994817`,
    `BATTLE_DMG_BONUS_C = -6.054955248445392` — `bonus(bst) = C + A·exp(-K·bst)` 형태로 175→+1,
    500→+5, 770→+10을 정확히 지나도록 피팅(캐치 확률과 기준점 175/500/770을 그대로 재사용,
    캐치는 감소함수라 K가 양수인데 이건 증가함수라 K만 음수로 다름).
  - `BATTLE_DMG_BONUS_MIN = 1`, `BATTLE_DMG_BONUS_MAX = 10`로 클램프(normal 카테고리 실제 bst
    범위가 정확히 175~770이라 이론상 안전장치용).
  - `BATTLE_DMG_BONUS_MEGA_GMAX = 15` — 메가/거다이맥스는 공식 대신 고정 보너스(캐치 확률이
    메가/거다이맥스를 고정 10%로 따로 처리하는 것과 같은 이유). 캐치 쪽 고정값(0.10)은 곡선의
    최솟값과 같아서 자연스러운 연장인 반면, 이건 곡선의 최댓값(10)보다 일부러 더 크게 잡아
    "귀하고 강한 개체일수록 더 세게 때린다"는 의도를 반영(수치적 대칭은 아니고 의도적 비대칭).
  - `getDamageBonus(bst, category)` 함수 신설(`rankMultiplier()` 바로 아래) — 메가/거다이맥스면
    고정값, 아니면 공식 계산 후 클램프+반올림.
  - 데미지 계산부(공격 처리 로직 내부)에서 공격자 자신의 `POKEMON_DATA[id]`를 조회해 `bst`(원본,
    이로치/CP 배율 미적용)·`category`를 `getDamageBonus()`에 넘기고, 기존
    `dmg = Math.round(BATTLE_BASE_DAMAGE * typeMult * rankMult * critMult)`를
    `dmg = Math.round((BATTLE_BASE_DAMAGE + dmgBonus) * typeMult * rankMult * critMult)`로 교체.
  - 이로치 여부는 이번 보너스에 영향 없음(실제 포켓몬처럼 이로치는 겉모습만 다르고 능력치엔
    영향 없다는 원칙 유지 — 이로치 CP 배율은 어디까지나 캐치 점수 표시 전용으로 남겨둠).
  - 파일 상단 배틀 섹션 설명 주석도 "능력치 미반영 → 기준값만" 문구를 "종족치 보너스 반영,
    개별 능력치는 아직 미반영"으로 갱신.
- 검증: `node --check`로 9개 js 파일 전수 통과. Node로 175/500/770 대입 시 정확히 1/5/10이
  나오는지, 175~770 구간 5단위 스캔으로 보너스가 단조증가(비감소)하는지, 메가/거다이맥스가
  bst 값과 무관하게 항상 15를 반환하는지 재확인. 실제 배틀 진행 중 데미지 수치가 어떻게
  체감되는지는 브라우저에서 직접 확인 필요(파일 기반 페이지라 Claude가 직접 테스트 불가).

## 85. 배틀 "충전하기"(비활성 장식) 버튼을 "상태 확인" 버튼으로 교체 + 상성 확인 오버레이 추가

- 사용자 요청(순서대로 다듬음):
  1. "충전하기가 아닌 새로운 기능으로 만들어볼까해" → "상태 확인 버튼으로 바꾸고 버튼을 누르면 캐치게임의
     퀴즈창 같은 오버래이 창이 뜨게해줘 그리고 거기서 내포켓몬 슬롯 3개 상대 포켓몬 슬롯 3개를 보여준 후
     현재 나가있는 포켓몬이 상대 포켓몬과 어떤 상성인지 보여줘".
  2. "상성은 내 포켓몬의 공격 기준으로만 정보를 보여줘 그리고 보여줄 때 (judgment.png) 여기에 있는 3개의
     아이콘을 사용해 원아이콘은 효과가 굉장, 매우굉장, 세모 아이콘은 효과가 별로, 매우별로 엑스 아이콘은
     효과가 없음으로 이름 왼쪽 옆에 표시해줘 상대 포켓몬의".
  3. "현재 전장에 있는 포켓몬은 지금저럼 빨간칸으로 표시하되 상대와의 상성은 모든 포켓몬 대상으로 표시해줘"
     → "내 포켓몬에 상성 아이콘은 왜 나오는거야?" → "내가 내 포켓몬은 눌러서 내 다른 포켓몬 입장에서의 상성보
     보게 해줬으면 좋겠어" / "눌러서 본다는 건 지금 전장에 나가있는게 먼저 창에 빨간 칸으로 표시되지만 내가
     클릭을 해서 빨간칸을 다른 포켓몬으로 변경했을때 상대에게 유리한지 여부를 상대 포켓몬 이름옆 아이콘으로
     보여달라는거야 내 포켓몬 이름 옆에는 아이콘이 필요없지 배틀은 상대랑만하니까".
  4. 최종: "그냥이렇게 하자 상태 확인 창에서 내 전장에 있는 포켓몬이 빨간 칸으로 선택 되어있는게 디폴트고 상대
     현재 전장에 있는 포켓몬은 빨간 칸으로 표시 하지 마 빨간 칸은 내가 선택할 수 있고(내포켓, 상대포켓 다
     가능) 선택하면 선택한 포켓몬 입장에서 상대포켓몬의 상성을 보여줘 그러니까 상성아이콘이 내 포켓몬
     상대포켓몬 이름 앞에 다 나타날 수 있는 거지".
  5. "지금은 내가 모르는 상대포켓몬으 상태확인창에 보이잖아 내가 확인해서 아는 포켓몬만 보이게 해 모르는 건
     (000.png) 이 물음표를 슬롯에 스프라이트 이미지 대신 써" → (물음표 이미지를 128×64짜리로 교체하며)
     "물음표 아이콘 이걸로 쓸게 포켓몬 아이콘 처럼 첫번쨰 프레임만 써".
- 최종 동작: 액션박스 "충전하기"(`disabled`, 핸들러 없음)를 `#battle-status-btn`("상태 확인")으로 교체.
  누르면 `#battle-status-modal` 오버레이가 뜸(`#quiz-modal`/`#quiz-box`와 같은 디자인, × 닫기는
  `.quiz-close-btn` 재사용). 내 포켓몬 3칸 + 상대 포켓몬 3칸을 앞모습 애니메이션으로 보여주고(기존
  `createSlotSpriteController`를 내/상대 각각 하나씩 재사용, 기절한 칸은 `.fainted` 흑백·반투명), 빨간 칸
  (`.active`)은 내/상대 어느 칸이든 하나만 선택 가능하며 열 때의 기본값은 내 전장 포켓몬(상대 전장 포켓몬은
  강조하지 않음). 선택한 포켓몬이 반대편 3마리를 공격할 때의 순수 상성(`getBaseTypeMultiplier`, 단일 타입
  보정 제외)을 반대편 이름 왼쪽 판정 아이콘으로 표시 — `images/pokemon/layout/judgment.png`(96×32, 32px
  3칸이 O / X / △ 순서)를 12px로 줄여 `.bs-icon`(background-position 0 / -12px / -24px)으로 사용,
  굉장·매우 굉장=O, 별로·매우 별로=△, 효과 없음=X, 보통=아이콘 없음. 선택한 칸과 같은 편에는 표시하지 않음.
  기절한 포켓몬도 선택 가능(정보 확인용), 빈 칸은 선택 불가. 상대 포켓몬은 배틀 중 실제로 전장에 나온 것만
  "아는" 포켓몬으로 보여줌(AI 엔트리의 `known` 플래그 — `pickAiTeam()`에서 false, `switchAiToIndex()`에서
  true; 첫 등장·자진 교체·기절 후 교체가 모두 이 함수를 거침). 아직 안 나온 상대는 슬롯에 스프라이트 대신
  `images/pokemon/layout/000.png`(128×64, 프레임 2장 중 첫 프레임만 정지 표시 — 도감 아이콘 `.dex-icon`과
  같은 32×32 박스 + `background-size: 200% 100%`)와 이름 `???`만
  보이고(`.unknown`), 선택할 수 없으며(타입이
  드러나므로) 상성 아이콘도 표시하지 않음. 한 번 알려진 상대는 기절 후에도 계속 보임. 턴을 쓰지 않는 정보 전용이며 연출 중
  (`battleTurnBusy`)/종료 후(`battleEnded`)에는 열리지 않음.
- 구현 파일: `index.html`(버튼 교체, 오버레이, 이름 줄 `.battle-status-namerow` + `.bs-icon`), `style.css`
  (오버레이/박스, `.fainted`/`.active`, 아이콘 스프라이트), `pokemon_battle.js`(`openBattleStatus()`,
  `closeBattleStatus()`, `updateBattleStatusMatchups()`, `matchupIconClass()`, 선택 상태
  `battleStatusSelected = { side, idx }`, `resetBattlePreview()`에서 오버레이 닫기·타이머 정리).
  이름 줄(`.battle-status-namerow`)은 높이를 12px로 고정하고 이름 줄높이도 12px로 맞춰, 아이콘이 있을 때/없을
  때 이름 글자 위치와 위쪽 스프라이트 박스 크기가 달라지지 않게 함(예전엔 이름 줄 11px vs 아이콘 12px 차이로
  아이콘이 붙는 순간 이름이 미세하게 어긋남 — 사용자 지적: "상성 볼때 이름 옆에 아이콘이 없을 때랑 있을때랑
  이름 텍스트의 높이위치가 미세하게 다른데 확인해봐").
  각 슬롯의 이름 밑에는 타입 뱃지 줄(`.battle-status-types`)을 추가함 — 사용자 요청: "슬롯 칸 이름밑에
  (types.png) 를 사용해서 이름 글씨 크기와 비례하게 타입을 보여줘". `types.png`(64×560, 20칸×28px)를 정확히
  30×13(이름 글씨 10px 기준)으로 쓰고 1~2타입을 가로로 나열, 기존 `renderTypeBadges()`에 선택 인자
  `badgeHeight`를 추가해 재사용. 크기는 배틀 화면 체력바 위의 비율(이름 16px : 뱃지 48×21 → 뱃지 높이 1.31배,
  너비 3.0배)과 맞춘 값이며(사용자 지시: "글씨 굵기는 손대지 말고 크기랑 비율만 일치시켜봐" — 이름 굵기는 그대로),
  뱃지가 없는 칸에서도 줄 높이는 13px로 고정하고, 줄이 늘어난 만큼 칸
  비율을 1:1→5:6으로 키워 스프라이트 박스 높이를 유지. 모르는 상대는 정체가 드러나지 않도록 타입을 표시하지 않음.
  아이콘 요소는 이름 요소의 형제로 둠(슬롯 컨트롤러 `clear()`가 이름 요소를 비울 때 같이 지워지지 않도록).
  포획 게임의 `#charge-btn`은 별개 요소라 영향 없음.
- 검증: 10개 js 파일 전수 `node --check` 통과. 브라우저 동작(레이아웃, 아이콘 선명도(12px), 선택 이동,
  교체·기절 후 재오픈)은 파일 기반 페이지라 Claude가 직접 확인 불가 — 사용자 확인 필요.

## 86. AI 트레이너 행동 판단을 "조건문 우선순위"에서 "4행동 통합 스코어링"으로 전면 개편

- 배경: 외부 팬게임 `another_red_aio`(Pokemon Essentials 기반)의 `Data/Scripts.rxdata`를 Python(`rubymarshal`+`zlib`)으로
  493개 스크립트 섹션 전체를 텍스트로 추출해 트레이너 배틀 AI 로직(`AI_Switch`/`AI_ChooseMove`/`AI_MoveEffects_Healing` 등)을
  분석함. 팬게임은 기술마다 점수를 매겨(기본 100점) 수십 개 요인(예상 데미지, KO 예측, 상태이상, PP 등)으로 가감한 뒤
  가중 랜덤으로 고르는 구조인데, 우리 게임은 능력치·상태이상·특성·아이템이 없어 그대로 이식할 수 없다는 걸 확인. 이후
  사용자 요청으로 범위를 좁혀감: "회복: 연속 매력도 점수 → HP 30% 하드 임계값 + 횟수 제한, 교체: 10여 개 조건 합산 점수 →
  상성 0.5배 단일 조건 + 확률, 기술 선택: 가중치 경쟁 → if-elif 우선순위 + 확률 분기 라는 우리 게임의 로직에 팬게임
  로직을 얹어서 좀더 정교하고 자연스러운 ai트레이너와의 배틀을 구상하고 싶은데". 이어서 "우리 게임에서 배틀 로직으로
  사용하는 요소로 구현할 수 있는 로직이라고 감안할때 일치성"을 물어본 과정에서, 지금까지 AI 판단이 "공격 방향 상성"만
  쓰고 "피격 방향(상대가 나를 때리면 얼마나 아픈지)"은 전혀 안 쓰고 있었다는 빈틈을 발견(`getAttackEffectiveness`를
  인자만 뒤집으면 새 코드 없이 채울 수 있는 구멍이었음). 최종적으로 사용자가 범위를 직접 확정: "우리 게임은 1:1
  배틀이고 공격 턴에 할 수 있는게 교체, 공격, 랭크업, 회복, 그리고 상성과 종족치, 타입(단일, 2개)라는 요소로 만들수
  있는 배틀로직 계획해줘". 트레이너별 성격/난이도 차등과 AI 파티 구성(`pickAiTeam`) 개편은 사용자가 명시적으로 범위
  밖으로 제외함(계획은 `.claude/plans/sprightly-humming-wind.md`에 작성 후 승인받아 진행).
- 구현 내용 (`pokemon_battle.js`):
  - **공용 예측 함수 3개 신규 추가**(전부 기존 `getAttackEffectiveness`/`getDamageBonus`/`rankMultiplier`만 조합, 새
    데이터 없음):
    - `getThreatMultiplier(myTypes, foeTypes)` — `getAttackEffectiveness(foeTypes, myTypes)`를 그대로 반환하는
      래퍼. "상대가 나를 때리면 얼마나 아픈가"(피격 방향)를 처음으로 AI 판단에 편입시킴.
    - `estimateDamage(attackerInfo, attackerRank, defenderTypes)` — `Math.round((BATTLE_BASE_DAMAGE + getDamageBonus(bst, category)) * getAttackEffectiveness(...) * rankMultiplier(rank))`.
      실제 데미지 공식(`resolveSingleAction`)과 동일하되 치명타는 굴리지 않는 예측 전용 버전.
    - `scoreBenchCandidate(candidateInfo, candidateRank, candidateHpRatio, foeInfo, foeRank)` — 교체 후보(또는
      현재 활성 개체) 1마리의 종합 가치. `offense = estimateDamage(후보→상대) / 100`, `defense = estimateDamage(상대→후보) / 100`로
      두고 `점수 = 1.0×offense − 0.8×defense + 0.3×candidateHpRatio`. 교체로 새로 들어오는 후보는 `candidateRank=0`
      고정(교체 시 랭크가 리셋되는 기존 규칙과 일치) — 그래서 랭크를 많이 쌓은 채 계속 나가있는 개체는 "유지 점수"가
      랭크만큼 부풀어 있어 자연스럽게 잘 안 바뀜.
  - **`weightedPick(scores)` 신규** — `{key: score}` 객체를 받아 점수 비례 가중 랜덤으로 key 하나를 반환(점수 전부 0이면
    최고점을 그대로 반환). `clamp(v, min, max)`도 신규 추가.
  - **`computeAiActionScores(aiEntry, defenderId, defenderHp)` 신규** — 공격/랭크업/회복/교체 4가지에 각각 점수를 매김:
    - 공격: `max(5, 100 × outgoingMult) × (1 + 0.15 × aiRank)`, 이번 공격 예상 데미지가 상대 남은 HP 이상이면(KO 예측)
      **×3** 배율(`AI_ATTACK_KO_BONUS_MULT`). 상성 0배(면역)여도 5점 밑으로는 안 내려감(`AI_ATTACK_SCORE_FLOOR`).
    - 랭크업(랭크 6단 미만일 때만): `60 × (1 − aiRank/6) × matchupDamp × threatDamp × hpSafety`.
      `matchupDamp`는 이미 상성 2배 이상이면 0.3으로 감쇠(`AI_RANKUP_GOOD_MATCHUP_DAMP`), `threatDamp`는
      `clamp(1 − (위협배율−1)/3, 0.15, 1)`(위협이 클수록 최소 0.15까지 감소), `hpSafety`는
      `clamp(내hp비율/0.4, 0, 1)`(HP 40% 밑으로는 선형으로 0까지 깎임 — 죽기 직전 랭크업 방지, 신규).
    - 회복(HP<100%이고 이 개체로 아직 2회 미만 회복했을 때만, `AI_HEAL_MAX_USES=2` 그대로 유지): 기존 "HP 30% 이하면
      무조건 회복"이던 하드 임계값을 폐지하고, `deficit = clamp((0.7 − hp비율)/0.7, 0, 1)`(HP 70%, `AI_HEAL_SOFT_CEILING`,
      부터 점수 발생)로 `100 × deficit^1.5`(`AI_HEAL_SCORE_EXP`)의 연속 곡선으로 변경. 회복 후 예상 HP로도 상대의
      예상 데미지를 못 버티면(회복해도 한 방에 죽음) ×0.25(`AI_HEAL_FUTILE_DAMP`), 이번 턴에 상대를 끝낼 수 있으면
      ×0.2(`AI_HEAL_KO_OPPORTUNITY_DAMP`)로 점수를 깎아 "헛수고 회복"과 "회복보다 마무리"를 억제.
    - 교체: `scoreBenchCandidate`로 "지금 자리 유지" 점수와 벤치 최고 점수를 비교해, 벤치가 더 높으면
      `(벤치최고점 − 유지점수) × 150`(`AI_SWITCH_SCORE_SCALE`)을 그대로 교체 액션 점수로 사용 — 기존 "상성 0.5배
      이하일 때만 고려 + 무조건 50%"이던 이진 게이트/고정 확률을 완전히 폐지하고, 공격/랭크업/회복과 동일한 저울
      위에서 경쟁하는 4번째 선택지로 통합.
    - 네 점수를 `weightedPick`에 넘겨 하나를 확률적으로 선택. **기존 `pickAiAction` 함수는 삭제**하고
      `computeAiActionScores`에 완전히 흡수됨.
  - `pickAiTurnAction(aiEntry, defenderId, defenderHp)` 전면 재작성 — `computeAiActionScores` 호출 후
    `weightedPick`으로 4택1, `switch`가 뽑히면 `{ switch: idx }` 형태로 반환(인터페이스는 기존과 동일하게 유지해
    호출부 `runTurnSequence` 쪽은 무변경).
  - `autoSwitchAiNext(onDone)`(기절 시 강제 교체) 재작성 — 기존엔 순수 상성 배율(`getAttackEffectiveness`) 최댓값만
    봤는데, 자진 교체와 동일한 `scoreBenchCandidate`(공격+방어+HP 종합)로 바꿔 확정 선택(강제 상황이라 확률은 그대로
    없음). 상성은 비슷해도 상대에게 덜 위협받는 개체를 우선하게 됨.
  - `startPlayerTurn`(1095행 부근) 호출부 변경 — 기존엔 `pickAiTurnAction(aiEntry, playerTypes)`로 상대 타입만
    넘겼는데, 새 스코어링이 종족치(bst)/카테고리까지 필요로 해서 `pickAiTurnAction(aiEntry, selectedBattleId, battleParty[activePartyIndex].hp)`로
    상대 id와 현재 HP를 넘기도록 변경.
  - 상수 정리: 기존 `AI_HEAL_HP_THRESHOLD`(0.3, 하드 임계값)는 제거. `AI_HEAL_MAX_USES`(2, 무한 회복 방지 안전장치 —
    팬게임엔 없는 우리 게임 고유 장치)는 그대로 유지. 새 상수 15종(`AI_SCORE_BASE`, `AI_ATTACK_*` 3종, `AI_RANKUP_*` 5종,
    `AI_HEAL_SOFT_CEILING`/`AI_HEAL_SCORE_EXP`/`AI_HEAL_FUTILE_DAMP`/`AI_HEAL_KO_OPPORTUNITY_DAMP`, `AI_SWITCH_*` 4종)을
    317~361행 상수 블록에 추가.
  - 기존 상성 계산 함수(`getTypeEffectiveness`/`getBaseTypeMultiplier`/`getAttackEffectiveness`)와 실제 데미지
    계산(`resolveSingleAction`)·회복량 공식·랭크 리셋 시점(교체 시 0으로 초기화)은 전부 무변경 — AI 판단 로직만
    이 기존 공식들을 "예측용"으로 재사용하는 방식이라 실제 판정 결과(명중/치명타/데미지)에는 영향 없음.
- 검증: `node --check pokemon_battle.js` 통과. 10개 js 파일을 `index.html` 로드 순서대로 이어붙인 뒤에도
  `node --check` 통과(모듈화 이후 관례대로). 브라우저 실제 플레이(랭크 쌓은 개체가 잘 안 바뀌는지, 위협이 큰
  상대에게 랭크업 대신 교체/회복을 더 고르는지, 회복해도 죽을 상황에 회복을 덜 쓰는지, 상대를 끝낼 수 있을 때
  공격을 우선하는지)는 파일 기반 페이지라 Claude가 직접 확인 불가 — 사용자 확인 필요.

## 87. 공격 메뉴에 상성 효과 미리보기 텍스트 + 아이콘 추가

- 사용자 요청 원문: "공격 버튼 아래에 상성 배수에 따라 효과가 매우 굉장함, 효과가 굉장함, 효과 있음, 효과가 별로,
  효과가 매우 별로, 효과 없음으로 공격 버튼 텍스트 보다 작은 텍스트로 공격의 효과를 보여줘 이때 이 상성
  아이콘을 효과 텍스트 앞에 붙이는데 효과 있음(1배)는 아이콘이 없고, 효과가 굉장함 쪽은 빨간색 원 아이콘,
  효과가 별로 계열은 파란색 세모아이콘, 효과없으면 중간의 검은색 엑스 아이콘을 활용해"(빨강 원/검정 엑스/파랑
  세모 3개 아이콘이 나열된 참고 이미지 첨부 — 기존 `judgment.png`의 O/X/△ 순서와 동일).
- 구현 내용(`pokemon_battle.js`):
  - `attackEffPreview(mult)` 신규(1609행 부근, `matchupIconClass` 바로 옆) — 순수 상성(`getBaseTypeMultiplier`)을
    받아 `{icon, text}`를 반환. 경계값은 기존 데미지 멘트(`afterDamage`의 `effMessage`, 1095행 부근)와 완전히
    동일하게 맞춤: `mult===0`→"효과 없음"(아이콘 none), `mult>=4`→"효과가 매우 굉장함"(good), `mult>1`→"효과가
    굉장함"(good), `mult<=0.25`→"효과가 매우 별로"(bad), `mult<1`→"효과가 별로"(bad), 그 외(`mult===1`)→"효과
    있음"(아이콘 없음). 아이콘 클래스는 패치85에서 만든 `matchupIconClass()`를 그대로 재사용해 새 이미지 없이
    기존 `judgment.png`(빨강 O/검정 X/파랑 △ 3칸)만 씀.
  - `renderBattleMoveMenu()` 수정(785행 부근) — 메뉴를 그릴 때마다 지금 나가있는 내 포켓몬(`selectedBattleId`)과
    상대 활성 개체(`aiParty[activeAiIndex]`)의 타입으로 `attackEffPreview`를 계산해, "공격" 버튼에만
    `<span class="battle-move-label">라벨</span><span class="battle-move-eff">아이콘+텍스트</span>` 2단 구조를
    채움. "랭크업"/"회복" 버튼도 같은 2단 구조(미리보기 줄은 빈 채로)로 만들어 세 버튼의 세로 높이를 맞춤.
  - 데미지 계산에 쓰이는 단일 타입 보정(`typeMult`, `getAttackEffectiveness`)이 아니라 순수 상성(`baseMult`,
    `getBaseTypeMultiplier`)만 봄 — 실제 게임처럼 플레이어에게 보여주는 상성 판정은 항상 이 기준(패치 77의
    "데미지 멘트 판정에는 typeMult를 쓰지 않는다" 원칙과 동일).
- `style.css` 변경(최초 시도 → 사용자 확인 후 재수정, 과정 전체를 이 패치 하나로 묶어 기록):
  - **최초 시도**: `.battle-move-btn`을 세로 flex(라벨+미리보기 2단)로 바꿔 버튼 자체를 2줄짜리 박스로 만듦.
  - **문제**: 적용 후 "공격 랭크업 회복 버튼의 위치가 높아졌어"라는 사용자 리포트로 발견 — `#battle-move-list`가
    `align-items: center`라, 버튼이 2줄로 커지면서 그 중앙 기준으로 라벨이 원래보다 위로 밀려 보임(랭크업/회복도
    미리보기 줄은 비어있지만 같은 구조라 똑같이 밀림).
  - **최종 수정**: `.battle-move-btn`은 `position: relative`만 남기고 flex-column을 제거해 버튼 자체 높이를
    라벨 한 줄 기준으로 원상복구. `.battle-move-eff`를 `position: absolute; top: 100%`로 바꿔 버튼의 문서
    흐름 밖에서 바로 아래에 겹쳐 붙임(버튼 높이/정렬에 전혀 영향 없음). `.bs-icon`(judgment.png 아이콘)은
    기존 정의를 그대로 재사용.
  - **위쪽 여백(margin-top) 확정**: 버튼과 텍스트 사이 간격을 계산식으로 맞추려는 시도를 여러 차례 했으나
    (매번 사용자 요청으로 전체 롤백·기록삭제됨 — CHANGELOG엔 흔적 없음) 눈으로 보고 판단하는 쪽으로 방향을
    바꿔, 값을 `1px`로 바꿔 사용자가 직접 확인 후 "지금위치 딱 맘에 들어"로 최종 확정. `margin-top: 1px`.
- 검증: `node`가 이 환경에 설치돼 있지 않아 `node --check` 실행 불가(다른 방법 없음 확인). 이 세션의 브라우저
  패널이 로컬 `file://`을 정적 스냅샷으로만 열어 JS 실행이 막혀 있었고, 임시 로컬 서버로 우회를 시도했으나
  서버 프로세스 자체가 샌드박스 권한 문제(`os.getcwd`/파일 열기 모두 `PermissionError`)로 실행 불가해 직접
  렌더링 확인은 못 함(시도 후 임시 파일 정리 완료) → 정적 코드 리뷰로만 검증했고, 실제로 최초 시도의 버튼
  위치 밀림 문제도 Claude가 화면으로 미리 못 잡고 사용자가 브라우저에서 직접 확인하고서야 발견됨. 이후
  버튼 위치·위쪽 여백(margin-top:1px)은 전부 사용자가 브라우저에서 직접 확인·확정함 — **Claude가 직접
  렌더링을 볼 수 없었던 패치라, 시각적 결과는 전적으로 사용자 확인을 거쳐 완성됨.**

## 88. 배틀 파티 선택 슬롯에 상태 확인 화면과 동일한 타입 뱃지 표시

- 사용자 요청 원문: "상태 확인 창에서 슬롯 속에 포켓몬 이름 아래 타입이 보이듯이 포켓몬 배틀 버튼을 눌러
  포켓몬을 슬롯에 등록하는 화면에서 슬롯의 디자인이 상태 확인창 슬롯과 같게 타입도 보여줘"
- 배경: "포켓몬 배틀" 버튼 → 도감을 선택 모드(`dexPickerMode`)로 열었을 때 하단에 뜨는 파티 등록
  슬롯 바(`#dex-battle-slot-row`, index.html:233 부근)는 스프라이트+이름만 있고, 패치85에서 만든
  "상태 확인" 오버레이(`#battle-status-my-row`/`#battle-status-ai-row`)의 슬롯처럼 이름 아래 타입
  뱃지 줄은 없었음.
- 구현 내용:
  - `index.html`: `#dex-battle-slot-row`의 슬롯 3개 각각에 `<div class="battle-status-types
    type-badges"></div>`를 `.battle-slot-name` 바로 아래에 추가 — 상태 확인 슬롯과 똑같은 클래스를
    그대로 재사용(새 CSS 클래스 없이 기존 `.battle-status-types` 스타일을 그대로 물려받음).
  - `pokemon_battle.js`:
    - `renderBattleSlots()`(1432행 부근) — 슬롯을 채울 때 `renderTypeBadges()`(공용 계층,
      script.js)로 `.battle-status-types`에 타입을 그림. 뱃지 크기는 상태 확인 화면과 동일하게
      `STATUS_TYPE_BADGE_HEIGHT`(13px)를 그대로 씀.
    - `createSlotSpriteController().clear()`(1360행 부근) — 슬롯을 비울 때 `.battle-status-types`도
      같이 비우도록 보완(기존엔 스프라이트/이름만 지웠음). 이 컨트롤러는 상태 확인 슬롯과 공유하는
      함수라, 상태 확인 쪽은 원래 호출부(`renderBattleStatusSlots`)에서 이미 `typesEl.innerHTML=''`을
      먼저 해두므로 이 변경으로 인한 동작 차이 없음(중복 초기화만 됨).
  - `style.css`: `#dex-battle-slot-row .battle-slot`에 `aspect-ratio: 5/6` 추가(기존 1:1) —
    타입 뱃지 줄이 늘어난 만큼 상태 확인 화면(`#battle-status-box .battle-slot`, 패치85)에서 썼던
    것과 같은 방식으로 슬롯을 세로로 키워 스프라이트 표시 공간이 줄어들지 않게 함.
- 검증: `node` 미설치로 `node --check` 불가, 브라우저 패널도 로컬 `file://` 정적 스냅샷 제약으로
  직접 렌더링 확인 불가(패치87에서 확인한 것과 동일한 환경 제약) → 기존 상태 확인 화면 코드와
  1:1 대응되는 클래스/함수만 재사용했는지 정적 코드 리뷰로 검증. **브라우저 실제 확인은 사용자 몫.**

## 89. 배틀 파티 등록 화면 버튼 줄 상하 여백 균형 맞춤

- 사용자 요청 원문: "포켓몬 등록 창에서 랜덤 선택, 선택 완료 버튼 기준 상하 여백이 달라서 위쪽(슬롯과의)
  간격이 아랫쪽(창끝과의) 간격이 더 좁은데 위쪽 간격에 맞게 균형있게 조절해줘"
- 원인: "랜덤 선택"/"선택 완료" 버튼 줄(`#dex-battle-action-row`)이 선택 모드에서 `#dex-box`의 마지막
  자식이 되는데, 위쪽 간격(슬롯 바와의 간격, `margin-top: 12px`)과 아래쪽 간격(창 끝과의 간격,
  `#dex-box`의 공용 `padding-bottom: 18px`)이 서로 다른 값이라 비대칭으로 보였음.
- 구현 내용(`style.css`): `#dex-box`의 기본 `padding-bottom: 18px`(943행, 일반 도감 목록/정보 화면
  등 다른 모든 화면에서도 공유하는 값이라 그대로 둠)는 건드리지 않고, `#dex-box.picker-mode`
  (984행 부근, 선택 모드일 때만 붙는 클래스)에 `padding-bottom: 12px`를 추가해 위쪽 간격(12px)과
  같아지도록 선택 모드 화면에서만 좁힘.
- 검증: `node`/브라우저 렌더링 확인 불가는 이전 패치들과 동일한 환경 제약. 이번 값은 코드만으로
  계산 가능한 단순 px 비교라 정적으로는 12px=12px 대칭을 확인했지만, **실제 화면에서 균형있게
  보이는지는 사용자 확인 필요**.

## 90. 배틀 공격 모션 추가 (공격자 돌진 + 피격 점멸)

- 사용자 요청 원문: "이게임 공격모션 추가할래"
- 구현 내용(`pokemon_battle.js`, "공격 연출" 섹션 신설):
  - `playAttackLunge(attackerSide)` — "~의 공격!" 멘트가 끝나면 공격자 스프라이트 박스(내 쪽
    `#battle-back-sprite-box`, 상대 쪽 `#monster`)가 상대 방향(내 포켓몬은 위, 상대는 아래)으로
    28px 빠르게 튀어나갔다가 돌아옴(전진 65ms + 복귀 115ms).
  - `playHitBlink(defenderSide)` — 명중하면 맞은 쪽이 원작 게임처럼 4번 딱딱 끊어서 깜빡인 뒤(320ms)
    hp바가 줄어듦. 빗나가거나 효과 없음(0배)이면 돌진·점멸 둘 다 없이 바로 멘트로 넘어감(아래 원작
    확인 내용 참고).
  - 두 박스 모두 CSS `transform`(translateX(-50%) 등)으로 위치를 잡고 있고 기절 연출도 안쪽
    스프라이트의 transform을 쓰므로, Web Animations API로 개별 속성 `translate`/`opacity`만
    애니메이션해 기존 위치 계산과 겹치지 않게 함(fill 없음 → 끝나면 인라인 흔적 없음).
  - 진행 중인 연출은 `runningAttackAnims`에 모아두고, 배틀을 닫을 때 `cancelAttackAnimations()`로
    취소해 뒤이은 데미지/멘트 콜백이 돌지 않게 함.
- 검증: 로드 순서대로 이어붙인 전체 스크립트 jsc 문법 검사 통과. 브라우저에서 실제 배틀을 열어
  공격 → 돌진 → 점멸 → hp 감소 순서로 실행되는 것을 확인했고, 돌진 최고점에서 멈춘
  화면으로 양쪽이 서로를 향해 움직이며 잘리지 않는 것, 취소 후 translate가 none으로 원복되는 것을 확인.
- 이후 사용자 요청 "50%로 줄여줘 정수로"에 따라 돌진 320→160ms, 점멸 520→264ms로 단축(점멸은
  정확히 절반인 260ms면 한 구간이 32.5ms가 되므로, 구간을 33ms 정수로 맞춰 33×8=264ms로 조정).
- 이어서 "합계가 0.5가 되도록 다시 조절해줘 정수로"에 따라 돌진+점멸 합계를 500ms로 최종 확정:
  돌진 180ms(전진 63 + 복귀 117), 점멸 320ms(40ms × 8구간). 돌진 전환점(35%)과 점멸 구간이 모두
  정수 ms로 떨어지는 조합 중 원래 비율(돌진:점멸 ≈ 8:13)에 가장 가까운 값.
- 이어서 "5배수로" 요청에 따라 모든 구간을 5ms 배수로 재조정: 돌진 전진 65 + 복귀 115 = 180ms,
  점멸 40ms × 8 = 320ms, 합계 500ms 유지. 전환점을 35% 고정 비율로 두면 5배수가 안 나오므로
  `ATTACK_LUNGE_DURATION`을 `ATTACK_LUNGE_OUT_MS`/`ATTACK_LUNGE_BACK_MS` 두 상수로 나눔.
- 이어서 "맞지 않을때도 공격모션이 나가게 되어있어?" → "실제 포켓몬 게임은 어떻게 하는지 알아봐줄수
  있어?" → "응 원작처럼 바꿔줘": 처음엔 빗나가도 돌진은 나오게 했었는데, 팬게임(another_red_aio,
  Pokemon Essentials) 원본 `Battler_UseMove`의 `pbProcessMoveHit`을 확인해 보니 명중 판정
  (`pbMoveHitFailedAccuracy?`)이 기술 애니메이션(`pbShowAnimation`)보다 먼저이고, 빗나가거나 면역이면
  애니메이션 전에 return함(PluginScripts에도 이 흐름을 바꾸는 오버라이드 없음). 이에 맞춰
  `resolveSingleAction()`에서 돌진을 명중·면역 판정 뒤로 옮겨, 명중했을 때만 돌진 → 점멸 → hp 감소가
  재생되도록 변경.

## 91. 랭크업/회복 이펙트 추가 + 이로치·칼춤·회복 이펙트 로직 통일

- 사용자 요청 원문(주요):
  - "랭크업과 회복은 원작의 스프라이트 시트만 가져와서 이로치 처럼 적용하고 기타 색변화는 일체 사용하지
    않을거야 스프라이트 시트 가져올때 랭크업은 칼춤 스프라이트, 회복은 hp회복 스프라이트 가져와"
  - "내가 원하는 것은 이로치, 칼춤, 회복 이펙트가 일관성 있는 로직을 가지고 적용되었으면 하는 바람이 있어 …
    이 이로치 이펙트를 프레임별로 분석하고 분석한 데이터를 칼춤 이펙트의 모든 프레임, 회복 이펙트의 모든
    프레임과 비교해서 동일한 크기가 되도록 설정해줘."
  - "통일한 로직은 그대로 두고 원작 위치로 바꿔줘"
  - "좌우평균으로 다시 돌아가줘 그리고 md에서는 최종 변경된것만 정리해"
  - (가로·세로를 0번 프레임 대신 모든 프레임 평균으로 바꾸면 어떻게 달라지는지 분석 후) "진행해줘"
  - "칼춤 이펙트가 머리 위에 나타나는게 원본인데 … 살짝 아래에 있는거 같거든" → "위치만 원작처럼 고쳐줘"

**최종 결과**

| 항목 | 이로치 | 칼춤(랭크업) | HP회복(회복) |
|---|---|---|---|
| 그림 | `images/pokemon/layout/shiny.png`(기존) | 원작 `PRAS- Swords Dance + Signal Beam.png`의 칼 | 원작 `PRAS- Recovery.png`의 반짝임 |
| 필름스트립 | 31프레임 × 771px | 21프레임 × 240px | 9프레임 × 156px |
| 시트 규칙 | 프레임 한 변 = 모든 프레임을 합친 최대 범위의 긴 변, 프레임 중심 = 그 범위의 중심 | 같음 | 같음 |
| 크기 | 포켓몬 그림(투명 제외)의 가로·세로를 모든 프레임에서 평균낸 뒤, 그 가로·세로를 다시 평균 × 표시 배율 | 같음 | 같음 |
| 위치 | 포켓몬 박스 중앙 | 칼 무리 중심 = 포켓몬 머리 끝(중앙에서 키의 절반 위, 원작과 같은 관계) | 중앙 |
| 속도 | 30ms/프레임 | 같음 | 같음 |
| 색 변화 | 없음 | 없음(원작 tone 제외) | 없음(원작 tone 제외) |
| 재생 조건 | 이로치 등장 시 | 랭크업 성공 시에만 | 회복 성공 시에만(이펙트 후 HP 증가) |

**구현 내용**
- 이펙트 그림: 칼춤 시트에는 칼 그림이 1장뿐이라, 원작 `Data/PkmnAnimations.rxdata`의 `Move:SWORDSDANCE`/
  `Move:RECOVER` 칸 데이터(위치/배율/회전/불투명도)대로 프레임마다 합성해 가로 필름스트립으로 저장
  (`images/pokemon/battle_effect/swords_dance.png`, `recover.png`). 그림이 없는 앞뒤 프레임은 뺌.
- 크기 통일을 위한 프레임 분석(투명 제외 bbox, 모든 프레임 합친 범위):

  | 이펙트 | 최대 범위 | 합성 직후 프레임 대비 | 합성 직후 범위 중심 | 최종 시트 |
  |---|---|---|---|---|
  | 이로치 | 770×753 (프레임 771) | 거의 100% | 프레임 중앙 | 그대로 |
  | 칼춤 | 233×240 (프레임 364) | 약 65% | 중앙보다 61px 위 | 100%, 중앙 |
  | 회복 | 156×148 (프레임 176) | 약 87% | 중앙보다 13px 아래 | 100%, 중앙 |

  칼춤/회복 시트를 이로치와 같은 규칙으로 잘라(그림 픽셀은 그대로), 프레임 크기만 같으면 세 이펙트가 같은
  크기로 보이게 함.
- 포켓몬 크기 데이터: 기존 오프셋 데이터의 `w`/`h`는 0번 프레임(정지 포즈) 실측값이라, 애니메이션 중 크기가 크게
  바뀌는 종(예: 또가스 109번 0번 34×35 → 평균 56.5×43.9, 메테노 폼 774-1 0번 63×64 → 평균 38.2×35.8)은 평소 보이는
  크기와 달랐음. 모든 스프라이트(앞모습 3,182 + 뒷모습 3,182파일)의 모든 프레임 bbox를 재서 평균 가로·세로를
  `pokemon_front_sprite_offsets_data.js`(`effectW`/`effectH`, `shinyEffectW`/`shinyEffectH`)와
  `pokemon_back_sprite_offsets_data.js`(`effectW`/`effectH`)에 이펙트 전용 필드로 추가(기존 값은 그대로 — 새 필드를
  빼면 파일이 이전과 완전히 같음). 0번 프레임 기준 대비 이펙트 크기는 약 80%가 ±3% 이내로 거의 같고, 평균 변화는
  앞모습 −0.1%·뒷모습 +0.2%, 10% 넘게 바뀌는 종은 앞 57개·뒤 36개.
- 공통 로직(`script.js`): `getEffectSize(w, h, pixelScale)`(가로·세로 평균 × 배율, w/h로 위 평균값을 넘김), `playFrameEffect(el, boxEl, size,
  bodyHeight, effect, onFinish)`(박스 중앙 배치 + `effect.offsetY × bodyHeight`(포켓몬 키 = 평균 세로 × 배율)만큼 세로 이동 +
  필름스트립 재생, interval id 반환),
  `SHINY_EFFECT`. `playShinyEffect()`(포획 게임·배틀 상대), `playBackShinyEffect()`(배틀 내 쪽),
  `playBattleEffect()`(칼춤/회복)가 모두 이 두 함수를 씀 — 포획 게임 이로치 효과 크기도 함께 바뀜
  (세로 기준 → 가로·세로 평균, 좌우로 납작한 포켓몬은 커지고 세로로 긴 포켓몬은 조금 작아짐).
- 배틀(`pokemon_battle.js`): `BATTLE_EFFECTS`(`{ src, frameCount, offsetY? }`, 칼춤만 `offsetY: -0.5` — 원작에서 칼 범위
  중심(포켓몬 중심보다 61px 위)이 기준 포켓몬(키 128)의 머리 끝(64px 위)과 거의 같은 높이라, 칼 무리 중심을 머리 끝에 맞춤),
  `displayBackSprite()`가 `currentBackEffectSize`/`currentBackEffectBodyHeight` 저장, `resolveSingleAction()`의 랭크업/회복 성공 분기에 연결, 배틀을 닫으면
  `cancelAttackAnimations()`에서 `stopBattleEffect()`로 정리. `index.html`에 `#battle-move-effect`, `style.css`에 스타일 추가.

**검증**
- 로드 순서대로 이어붙인 전체 스크립트 jsc 문법 검사 통과.
- 필름스트립 격자 미리보기로 칼 궤적/반짝임 위치, 원작 색 유지, 잘림 없음 확인. 재분석으로 세 시트 모두
  최대 범위 ≈ 프레임 100%, 중심 ≈ 프레임 중앙(오차 1px 이내).
- 새 데이터를 만들 때 측정한 0번 프레임 값이 기존 `w`/`h`와 일치하는지 대조해 파일 매칭을 확인(앞모습 3,177/3,182,
  뒷모습 3,182/3,182 일치 — 불일치 5개는 이로치 모자 피카츄 25-2~25-6의 기존 데이터 값이 서로 뒤섞여 있는 것으로,
  이번 패치와 무관한 기존 데이터 문제라 그대로 둠. 새 평균값은 실제 파일에서 잰 값).
- 브라우저에서 같은 포켓몬 기준 세 이펙트 크기가 모두 같고 `(평균 가로 + 평균 세로) / 2 × 배율` 계산값과 일치
  (내 쪽 또가스 72.0px → 104.09px, 상대 쪽 피카츄 87.43px → 89.28px, 상대 쪽 메테노 폼 774-1 130.63px → 76.11px),
  칼춤 중심이 포켓몬 키의 절반 위(머리 끝)에 정확히 오는 것(내 쪽 피카츄 44.43px, 상대 쪽 566번 40.94px)과 회복은 중앙에
  그대로인 것을 수치로 확인. 상대 쪽에서 칼 무리 윗부분이 HP바 쪽으로 올라가는 부분은 94에서 HP바 뒤로 그려지게 처리함. 또가스는 가스까지 이로치 반짝임이 덮는 것을 화면으로 확인.
- 랭크업·회복 성공/실패 4가지 흐름(성공할 때만 이펙트, 회복은 이펙트 후 HP 증가 → 멘트), 이펙트 도중 배틀 닫기 시
  요소 숨김·타이머 해제·콜백 미호출 확인. 포획 게임 위치(`initGame()` 직접 호출)에서 이로치 효과 정상 재생 확인.

## 92. 이로치 코스프레 피카츄(25-2~25-6) 오프셋 데이터가 서로 뒤섞여 있던 문제 수정

- 사용자 요청: 91의 이펙트 크기 데이터를 만들다 발견한 데이터 불일치를 따로 패치하기로 하고, 계획 확인 후 "진행해줘".
- 원인 분석: 전체 오프셋 데이터(`x`/`y`/`w`/`h`/`topSafety`/`bottomSafety`)를 실제 파일에서 다시 재서 대조한 결과,
  앞모습 3,182개·뒷모습 3,182개 중 불일치는 `pokemon_front_sprite_offsets_data.js`의 25-2~25-6 이로치 값 5개뿐이었고,
  같은 값들이 서로 자리만 바뀐 상태였음(예: 25-2 데이터에 25-3의 실제 값이 들어 있음). 그림 파일은 일반/이로치가 같은
  의상으로 정상 짝지어져 있음을 눈으로 확인.

  | 폼 | 기존 데이터 (shinyX, shinyY, shinyW, shinyH) | 실제 파일 |
  |---|---|---|
  | 25-2 | 1.0, 1.0, 90, 94 | −2.0, 0.0, 84, 92 |
  | 25-3 | −4.0, 0.0, 80, 92 | 1.0, 1.0, 90, 94 |
  | 25-4 | 1.0, 0.0, 90, 92 | −1.0, 0.0, 86, 92 |
  | 25-5 | −1.0, 0.0, 86, 92 | 1.0, 0.0, 90, 92 |
  | 25-6 | −2.0, 0.0, 84, 92 | −4.0, 0.0, 80, 92 |

  이 이로치 5개는 표시 크기를 자기 `shinyH`로 계산(`SPRITE_SIZE_REF`로 기본형 25 크기에 맞춤)하므로 위치뿐 아니라 크기도 어긋나 있었음.
- 구현 내용: 5개 항목의 `shinyX`/`shinyY`/`shinyW`/`shinyH`를 실제 측정값으로 교체(정지 이미지라 `shinyTopSafety`는 0 그대로).
  측정 방식은 기존 데이터 6,359개를 정확히 재현하는 것으로 먼저 검증함. 이미지, 일반 값, 이펙트 평균값은 그대로.
- 검증: 수정 전후 비교로 5개 항목만 바뀌고 나머지 1,586개는 동일함을 확인. 데이터 파일 jsc 문법 검사 통과. 브라우저에서
  각 폼을 이로치 상대로 띄워 0번 프레임의 실제 그림 bbox를 재 보니 5개 모두 박스 중심과 정확히 일치(어긋남 0px), HP바 간격
  6.4px·그림 높이 116.4px로 기본형 피카츄(25)와 같음. 수정 전 값으로 되돌려 재면 25-3이 왼쪽 6.3px·위 1.3px 어긋나고 HP바
  간격이 3.8px로 좁아지며 크기도 약 2% 컸음.

## 93. 메테노 폼(774-1~774-7) 앞모습 0번 프레임의 외톨이 점 제거 + 오프셋 데이터 재측정

- 사용자 요청: 91 작업 중 메테노 폼이 화면에서 한쪽으로 치우쳐 보이는 것을 발견해 원인을 확인한 뒤, 계획 확인 후 "진행해줘".
- 원인 분석: `images/pokemon/pokemon/front/774-1.png`~`774-7.png` 7개 파일의 0번 프레임 왼쪽 위 구석 (0,0)에 불투명한
  검은 점(0,0,0,255) 1개가 찍혀 있었음. 이 점 때문에 0번 프레임 실측이 63×64(실제 그림은 37×35)로 잡혀 위치 보정값이
  `x: 16.5, y: 16`으로 틀어졌고, 배틀·포획 게임에서 메테노가 오른쪽 아래로 치우쳐 보였음(이펙트는 박스 중앙에 나와서
  그림과 어긋남). 전체 스프라이트의 모든 파일을 외톨이 점 기준으로 스캔한 결과 표시에 영향을 주는 건 이 7개뿐이었음
  (메테노 뒷모습 774-2/3/4/6/7의 마지막 프레임에도 외톨이 점이 있음 — 처음엔 화면에 안 나오는 파일로 잘못 판단했으나 실제로는
  내 쪽에서 폼별 뒷모습을 그대로 써서 95에서 따로 수정함. 메가 블로스터 687-mega의 외톨이 픽셀은 촉수·지느러미 끝의 원래 그림으로 확인).
- 구현 내용:
  - 7개 파일의 0번 프레임 (0,0) 픽셀만 투명하게 함. 원본 파일의 부가 정보 청크(bKGD/pHYs/tIME, 774-4는 sRGB/gAMA/pHYs)는
    그대로 두고 이미지 데이터(IDAT)만 교체. 원본과 비교해 이미지 크기(9024×96)·색상 형식(8비트 RGBA)·부가 정보가 같고
    바뀐 픽셀은 (0,0) 1개뿐임을 확인. **이 7개 파일은 이제 원작 팬게임 파일과 바이트 단위로 다름**(해시로 원작 폼을 찾는 방법은
    이 7개에서 안 통함).
  - `pokemon_front_sprite_offsets_data.js`의 7개 항목 일반 값을 기존 데이터를 정확히 재현하는 측정 방식으로 다시 잼:
    `x` 16.5→3.5, `y` 16.0→1.5, `w` 63→37, `h` 64→35, `topSafety` 0→9, `effectW/effectH` 38.2/35.8→37.9/35.5
    (같은 그림인 이로치 값과 일치). 이로치 값, 다른 항목은 그대로(수정 전후 비교로 7개 항목만 바뀌고 1,584개 동일 확인).
  - 774-x는 크기 보정 명단(`SPRITE_SIZE_REF`)에 없어 추가 영향 없음.
- 검증: 로드 순서대로 이어붙인 전체 스크립트 jsc 문법 검사 통과. 브라우저에서 774-1·774-4를 상대로 띄워 0번 프레임의 실제
  그림 bbox를 재 보니 (0,0) 점이 사라졌고(bbox 26,29~63,64), 박스 중심과 정확히 일치(어긋남 0px), HP바 간격 29.1px로
  기본형 메테노(774)와 같음. 회복 이펙트를 띄워 그림과 겹쳐 나오는 것을 화면으로 확인. 원본 7개는 작업용 임시 폴더에 백업해 둠.

## 94. 상대 쪽 랭크업/회복 이펙트가 HP바·이름표를 덮던 문제 수정 (HP 표시를 이펙트 위에)

- 사용자 요청 원문: (본가·다른 배틀 게임의 처리 방식 조사 후) "그럼 방법 A로 HP바 겹침 패치 계획 세워주고 패치 후 결과를 가장 큰
  이펙트 크기 기준으로 스크린샷 찍어줘"
- 조사 내용: 원작 팬게임(Pokemon Essentials)은 기술 애니메이션 칸의 z가 최대 80, HP 박스가 150 이상이라 HP 박스가 항상 위(플러그인도
  변경 없음). 본가 3세대(pokeemerald)는 `LaunchBattleAnimation`에서 HP 박스 OAM 우선순위를 0(맨 앞)으로 올렸다가 `Cmd_end`에서 1로
  되돌림. RPG Maker MV도 스킬 애니메이션은 배틀 스프라이트 층, HP 상태창은 그 위의 창 층. 즉 이펙트 위치는 두고 HP 표시를 위에 그리는
  방식이 일반적.
- 원인 분석: 칼춤 위치를 머리 끝 기준으로 올린 뒤(91) 상대 쪽 칼 무리 윗부분이 HP바 위로 올라감. 랭크업/회복 이펙트 요소
  `#battle-move-effect`는 `#battle-preview-screen`(z-index 20) 안에 있는데, 상대 hp바/이름표(`#monster-info`/`#monster-info-text`,
  z-index 6)는 그 밖의 게임 컨테이너에 있어서 이펙트가 항상 그 위에 그려졌음. 내 쪽 hp바(`#battle-back-info`)와 상대 쪽 이로치
  이펙트(`#shiny-effect`)는 이미 같은 층에서 hp바보다 아래라 문제없었음.
- 구현 내용: 상대 쪽 전용 요소 `#battle-foe-move-effect`를 `#shiny-effect` 옆(게임 컨테이너)에 추가하고(`index.html`), 스타일은
  `#battle-move-effect`와 공유(`style.css`, z-index 2 < hp바 6). `pokemon_battle.js`의 `playBattleEffect()`가 내 쪽이면 기존 요소, 상대
  쪽이면 새 요소를 쓰고, `stopBattleEffect()`는 둘 다 숨김. 크기·위치 계산(`playFrameEffect`)은 그대로라 세 이펙트 통일 로직 유지.
- 검증: 로드 순서대로 이어붙인 전체 스크립트 jsc 문법 검사 통과. 화면에서 이펙트가 가장 크게 나오는 상대 포켓몬(792-1, 이펙트 172.7px,
  칼 무리 윗부분이 hp바 하단보다 약 82px 위까지 올라감)으로 칼춤을 띄워, 겹치는 부분에서 hp바와 이름/타입 뱃지가 칼 위에 그려지는 것을
  스크린샷으로 확인(이펙트 z 2, hp바·이름표 z 6, 같은 부모 요소). 내 쪽/상대 쪽 회복 재생·종료 시 각자 요소만 표시되고 숨겨짐, 상대 쪽
  칼춤 도중 배틀 닫기 시 요소 숨김·타이머 해제·콜백 미호출 확인.

## 95. 메테노 폼(774-2/3/4/6/7) 뒷모습 마지막 프레임의 외톨이 점 제거 + 오프셋 데이터 재측정

- 사용자 요청: `images` 폴더의 안 쓰는 파일을 점검하다가 93의 설명이 틀렸음을 발견해 알린 뒤, "메테노 뒷모습 패치 계획 세워줘"
  → 해상도 문제 여부 확인 후 "진행해줘".
- 원인 분석: 93에서 메테노 뒷모습의 외톨이 점은 "내 쪽은 기본형 774 뒷모습을 써서 화면에 안 나온다"고 판단했으나, 실제
  `backSpriteInfo()`(`pokemon_battle.js`)는 일반 카테고리도 폼 id 그대로 뒷모습 파일을 씀(없을 때만 기본형으로 대체). 그래서
  `images/pokemon/pokemon/back/774-2/3/4/6/7.png`의 마지막(93번) 프레임에 있는 짙은 검정(16,16,16,255) 외톨이 점(774-2 (2,1),
  774-3 (89,3), 774-4 (0,1)·(95,1), 774-6 (2,0), 774-7 (86,0)·(86,95), 총 7개)이 내 쪽에서 실제로 보였고, 774-7은 아래쪽 끝 점
  때문에 `bottomSafety`가 32(점을 빼면 7)로 잡혀 내 쪽 메테노가 약 50px 떠 보였음. 774-1/774-5, 기본형 774, 뒷모습 이로치 7개는 정상.
- 구현 내용:
  - 5개 파일의 외톨이 점만 투명하게 함. 원본의 부가 정보 청크(sRGB/gAMA/pHYs)는 그대로 두고 이미지 데이터(IDAT)만 교체.
    먼저 임시 폴더에서 시험 수정해 이미지 크기(9024×96, 774-3은 9494×101, 774-7은 9118×97)·비트 수·색상 형식(8비트 RGBA)·
    인터레이스 설정이 모두 같고 바뀐 픽셀이 점 개수와 정확히 같음을 확인한 뒤 적용. **이 5개 파일도 원작 팬게임 파일과 바이트
    단위로 달라짐.**
  - `pokemon_back_sprite_offsets_data.js`의 5개 항목을 기존 측정 방식으로 다시 잼: 774-7 `bottomSafety` 32→7, 5개 모두
    `effectW/effectH` 소폭 조정(예: 774-7 37.2/35.8→36.9/35.1, 774-4 47.1/35.4→46.4/35.1). `x`/`y`/`w`/`h`는 0번 프레임이 정상이라
    그대로(측정값이 기존 값과 같음을 확인). 수정 전후 비교로 5개 항목만 바뀌고 나머지 3,177개 동일.
- 검증: 로드 순서대로 이어붙인 전체 스크립트 jsc 문법 검사 통과. 브라우저에서 내 쪽에 774-5와 774-7을 띄워 그림 아래끝과
  이름표 사이 간격을 재니 둘 다 23.5px로 같음(수정 전 774-7은 약 50px 더 떠 있었음). 774-7의 93번 프레임에서 외톨이 점이
  사라진 것(그림 bbox 25,29~64,64)을 확인. 원본 5개는 작업용 임시 폴더에 백업해 둠.

## 96. 도감 스타일 주석의 "pokedex 폴더째 삭제해도 무방" 설명 바로잡기

- 사용자 요청: `images` 폴더의 안 쓰는 파일 점검 결과 중 "확인이 필요한 점"을 두고 "이 두가지도 손보자".
- 원인 분석: `style.css`의 도감 섹션 주석이 "`images/pokemon/pokedex/*`는 더 이상 쓰지 않음 — 폴더째로 삭제해도 무방함"이라고
  적혀 있었으나, 같은 폴더의 `icon_own.png`는 포획 완료 배지(`.dex-owned-badge`)에 지금도 쓰여서 폴더째 지우면 배지가 사라짐.
  (같은 폴더의 `icon_dynamax.png`, `icon_mega.png`는 실제로 코드에서 쓰지 않음.)
- 구현 내용: 주석을 "예전 참조 이미지는 안 쓰지만 `icon_own.png`는 지금도 쓰이므로 폴더째 삭제하면 안 됨"으로 수정(동작 변경 없음).
  함께 확인한 풀숲 이미지(`images/pokemon/layout/grass_a/b/bg.png`)는 사용자가 일부러 지운 것으로 확인되어 그대로 둠.
- 검증: 주석이 가리키는 선택자 이름(`.dex-owned-badge`)이 실제 CSS 규칙과 같음을 확인. 주석만 바뀌어 동작 영향 없음.

## 97. 배틀 파티 선택 슬롯 좌측 상단에 메가/다이맥스 폼 아이콘 표시

- 사용자 요청 원문: "그냥 이 아이콘을 배틀 슬롯에 좌측 상단에 보이게 해줘 해당되는 포켓몬 폼을 선택했을때" (`images/pokemon/pokedex`에
  새로 들어온 `icon_mega.png`, `icon_dynamax.png` — 크기를 icon_own에 맞추는 방안을 검토했으나 "됐고" 원본 그대로 쓰기로 함)
- 구현 내용:
  - `index.html`: 배틀 파티 선택 슬롯 바(`#dex-battle-slot-row`)의 슬롯 3칸에 `<span class="battle-slot-form-icon hidden">` 추가
    (상태 확인 화면의 슬롯에는 넣지 않음).
  - `style.css`: `.battle-slot-form-icon`(슬롯 좌측 상단 3px, 14px 칸, `background-size: contain`으로 원본 비율 유지),
    `.mega`는 `icon_mega.png`, `.gmax`는 `icon_dynamax.png`. 처음엔 포획 완료 배지와 같은 16px이었으나, 이후 큰 메가·거다이맥스
    스프라이트(메가골루그 등)의 날개·팔 끝과 겹치는 문제를 검토하며 모서리 배지 방식으로 옮겨 봤다가 "그냥 롤백해줘 사이즈만
    15로 해서"에 따라 원래 위치로 되돌려 15px로 줄였고, 이어서 10px·12px을 거쳐 "14기준으로 다시 바꿔줄래?"에 따라 최종 14px로 정함
    (겹침 계산상 이 위치에서 안 겹치는 최대 크기는 8px이라, 14px에서는 메가골루그·메가번치코 등 큰 폼 26개(일반·이로치 합 52가지)에서
    아이콘 뒤로 스프라이트 끝이 조금 가려질 수 있음. 16px일 때는 38개였음).
    이어서 "다이맥스 흰색테두리 때문에 메가에 비해 작아보이는데 수정 가능해?"에 따라, `icon_dynamax.png`(34×34)의 바깥 2px 흰
    테두리 때문에 안쪽 그림(30×30)이 여백 없는 메가 아이콘보다 약 12% 작게 보이던 것을 `.gmax`에만 `background-size: 113.33%`
    (34/30배, 가운데 정렬)를 줘서 흰 테두리를 칸 밖으로 밀어내 안쪽 그림이 칸을 꽉 채우게 함(이미지 파일은 그대로).
  - `pokemon_battle.js`: `setBattleSlotFormIcon(slotEl, category)` 추가 — 메가(mega)/거다이맥스(gmax)일 때만 해당 아이콘을 보이고
    나머지는 숨김. `renderBattleSlots()`에서 포켓몬 카테고리로 호출하고, 슬롯을 비우는 `clear()`에서도 숨김(아이콘 요소가 없는
    상태 확인 화면 슬롯은 그냥 넘어감).
- 검증: 로드 순서대로 이어붙인 전체 스크립트 jsc 문법 검사 통과. 브라우저에서 파티를 메가리자몽X(6-mega_x)·피카츄·거다이맥스
  리자몽(6-gmax, 이로치)으로 채워 첫 칸에 메가 아이콘, 셋째 칸에 다이맥스 아이콘이 좌측 상단에 뜨고 피카츄 칸은 숨겨지는 것을
  스크린샷으로 확인. 파티를 일반 폼 하나로 바꾸면 세 칸 모두 아이콘이 숨겨지고, 상태 확인 화면 슬롯에는 아이콘 요소가 없음을 확인.

## 98. 폼 아이콘·포획 완료 배지를 픽셀 유지(pixelated)로 표시해 흐릿함 해결

- 사용자 요청 원문: "아이콘이 흐릿해보이는건 기분탓인가?" → "그럼 그외 게임요소에서 pixelated 필요한 게 있는지 전수조사해줄래?
  이참에 다 바꾸게" → "응 둘 다 적용해줘"
- 원인 분석: 97의 폼 아이콘(`icon_mega.png` 28px, `icon_dynamax.png` 34px)과 포획 완료 배지(`icon_own.png` 30px)를 16px 칸에
  줄여 표시하는데, `image-rendering` 지정이 없어 브라우저가 픽셀을 섞어 축소(가장자리 번짐, 회색 테두리). CSS의 이미지 규칙과
  브라우저의 실제 계산값(`getComputedStyle().imageRendering`, 부모에게서 상속된 값 포함)을 전수 조사한 결과 픽셀 유지가 안 된
  것은 `.battle-slot-form-icon`(배틀 파티 선택 슬롯)과 `.dex-owned-badge`(도감 목록 줄 끝, 포획 게임 이름 앞) 두 스타일뿐이었음.
  포켓몬 스프라이트, 도감/포획 목록 아이콘, 이펙트, 몬스터볼, HP바, 액션박스, 타입 뱃지, 판정 아이콘은 직접 지정되어 있고,
  뒤로가기 화살표(`left_arrow.png`)는 부모 액션박스의 설정을 상속받아 이미 적용 중.
- 구현 내용(`style.css`): 두 스타일에 포켓몬 스프라이트와 같은 `image-rendering: pixelated / -moz-crisp-edges / crisp-edges`
  세 줄 추가. 크기·위치는 그대로.
- 검증: 브라우저에서 선택 슬롯의 메가·다이맥스 아이콘, 포획 게임 이름표 배지, 도감 목록 배지의 계산값이 모두 스프라이트와
  같은 `crisp-edges`로 바뀐 것과 화면 표시를 확인.

## 99. 포켓몬 도감 폼 칸에도 메가/다이맥스 폼 아이콘 표시 (잡은 폼만)

- 사용자 요청 원문: "포켓몬도감쪽에 폼칸(슬롯)에도 동일하게 아이콘 넣어줘 대신 포획 못한 건 보여주지 말고"
- 구현 내용:
  - `pokemon_pokedex.js`의 `renderDexFormGrid()`: 폼 칸을 만든 뒤, 그 칸이 `colored`(그 폼, 이로치 칸이면 그 이로치를 실제로 잡음)이고
    카테고리가 `mega`/`gmax`일 때만 `<span class="battle-slot-form-icon mega|gmax">`를 칸에 붙임. 못 잡은 칸(회색·잠김)과 일반 폼
    칸에는 붙이지 않음. 배틀 선택 모드는 원래 잡은 칸만 그리므로 같은 규칙이 그대로 적용됨.
  - `style.css`: 97/98의 `.battle-slot-form-icon` 스타일(14px, 좌측 상단 3px, 픽셀 유지, 다이맥스 흰 테두리 자름)을 그대로 재사용하고
    주석에 도감 폼 칸에서도 쓴다는 내용만 추가 — 배틀 슬롯과 도감 폼 칸의 아이콘 크기·모양이 항상 같음.
- 검증: 로드 순서대로 이어붙인 전체 스크립트 jsc 문법 검사 통과. 브라우저에서 포획 판정 함수만 페이지 메모리에서 임시로 바꿔(저장
  데이터는 건드리지 않음) 리자몽의 기본형·메가X(일반)·거다이맥스(이로치)만 잡은 상태로 도감 정보 화면을 열어, 잡은 메가X 일반 칸과
  거다이맥스 이로치 칸에만 좌측 상단 아이콘(3px, 14px)이 붙고 못 잡은 칸·기본형 칸에는 없음을 확인. 배틀 선택 모드에서도 잡은 칸만
  그려지고 아이콘이 붙으며, 우측 상단 파티 체크 배지(✓)와 겹치지 않음을 스크린샷으로 확인. 확인 후 새로고침으로 임시 상태 제거.

## 100. 배틀 상태 확인 화면 슬롯에도 메가/다이맥스 폼 아이콘 표시

- 사용자 요청 원문: "상태 확인 화면 슬롯에도 아이콘 넣어줘"
- 구현 내용:
  - `index.html`: 상태 확인 화면(`#battle-status-box`)의 슬롯 6칸(내 파티 3 + 상대 파티 3)에 `<span class="battle-slot-form-icon hidden">` 추가.
  - `pokemon_battle.js`의 `renderBattleStatusSlots()`: 정체가 드러난 포켓몬을 그릴 때 `setBattleSlotFormIcon(slotEl, category)`를 호출.
    아직 전장에 안 나온 상대(`known === false`, "???" 표시)는 기존처럼 `clear()`만 거쳐 아이콘이 숨겨져 정체가 드러나지 않음.
    빈 칸도 `clear()`에서 숨김. `setBattleSlotFormIcon` 주석을 상태 확인 화면 포함으로 수정.
  - `style.css`: `.battle-slot-form-icon` 주석에 상태 확인 화면에서도 쓴다는 내용 추가(스타일 값은 그대로 — 배틀 선택 슬롯·도감 폼 칸과 같음).
    기절한 포켓몬은 슬롯 전체의 흑백·반투명 처리를 그대로 따름.
- 검증: 로드 순서대로 이어붙인 전체 스크립트 jsc 문법 검사 통과. 브라우저에서 내 파티(메가리자몽X·피카츄·거다이맥스 리자몽 이로치)와
  상대 파티(정체 공개된 거다이맥스 거북왕, 아직 모르는 메가이상해꽃)로 상태 확인을 열어, 메가·거다이맥스 칸에만 좌측 상단 아이콘(3px, 14px)이
  붙고 피카츄·샤미드 칸과 정체 모르는 "???" 칸에는 없음을 수치와 스크린샷으로 확인. 확인 후 새로고침으로 임시 상태 제거.

## 101. 폼 아이콘(메가/다이맥스) 표시 판단을 공통 함수 하나로 통일

- 사용자 요청 원문: "다 같은 로직이야?" → "폼칸과 슬롯 및 아이콘의 위치등도 같은지 같이 확인해줘" → "공통 함수로 통일해줘"
- 확인 내용: 세 곳(배틀 파티 선택 슬롯, 상태 확인 슬롯, 도감 폼 칸)의 아이콘은 같은 `.battle-slot-form-icon` 스타일이라 크기(14×14)·
  위치(칸 바깥 모서리에서 5px, 테두리 안쪽 기준 3px)·픽셀 유지·다이맥스 흰 테두리 자르기(113.33%)·z-index가 브라우저 실측값까지 모두 같음.
  칸 크기는 화면별 레이아웃이라 다름(선택 슬롯 80×96, 도감 폼 칸 80×120, 상태 확인 슬롯 90.7×108.8). 다만 보이기/숨기기 판단은 두 슬롯이
  `setBattleSlotFormIcon()`을, 도감 폼 칸은 `renderDexFormGrid()` 안의 별도 조건문을 쓰고 있었음.
- 구현 내용:
  - `setBattleSlotFormIcon(slotEl, category)`를 `pokemon_battle.js`에서 공용 레이어 `script.js`("폼 아이콘(메가/다이맥스) 공통 로직")로 옮김.
    보여 줄 상황이 아니면(빈 칸, 정체를 모르는 상대, 못 잡은 폼) 호출하는 쪽이 `category`에 null을 넘기는 규칙으로 정리.
  - `pokemon_pokedex.js`의 `renderDexFormGrid()`: 칸마다 숨김 상태의 아이콘 요소를 만들고 `setBattleSlotFormIcon(cell, colored ?
    formInfo.category : null)`로 판단하도록 바꿔 별도 조건문 제거.
  - 97에서 이 함수를 `renderBattleSlots()`와 그 설명 주석 사이에 끼워 넣어 주석이 함수에서 떨어져 있던 것도 함께 바로잡음.
- 검증: 로드 순서대로 이어붙인 전체 스크립트 jsc 문법 검사 통과. 브라우저에서 포획 판정만 페이지 메모리에서 임시로 바꿔(저장 데이터는
  건드리지 않음) 일반 도감 폼 칸, 배틀 선택 모드의 폼 칸·선택 슬롯(채움/비움), 상태 확인 슬롯(정체 공개 거다이맥스, 정체 모르는 메가)을
  모두 확인해 통일 전과 결과가 같음(잡은 메가X 일반·거다이맥스 이로치 칸에만 표시, "???" 칸과 빈 칸은 숨김)을 확인. 확인 후 새로고침으로
  임시 상태 제거.

## 102. 공통 함수 정리 1단계 — 앞모습 스프라이트 경로·실측 데이터 조회를 공통 함수로 통일

- 사용자 요청 원문: "이처럼 게임 내에서 공통 함수를 써서 코드를 효율화 할 수 있는 부분에 대해 전수조사해줘" → (조사 결과와 추천 순서
  ① 경로·실측 데이터 조회 ② HP바·기절 연출 ③ 스프라이트시트 재생 확인 후) "추천 순서에 따라 진행할 계획인데 오류 없도록 해"
- 원인 분석: 앞모습 스프라이트 경로(카테고리 → 폴더 → `images/pokemon/pokemon/폴더/id.png`)를 포획 게임·도감 정보·배틀 파티 변환·
  배틀 슬롯 4곳에서 각자 조합했고, 실측 데이터(`SPRITE_OFFSETS`)에서 일반/이로치 값을 고르는 분기(`isShiny ? off.shinyH : off.h` 등)가
  8곳(포획 게임 몬스터 크기·위치, 이로치 이펙트, 도감 정보 크기·위치, 배틀 상대 배치·기절 연출·랭크업/회복 이펙트, 배틀 슬롯 크기·위치)에
  흩어져 있었음.
- 구현 내용(동작 변경 없음):
  - `script.js`에 `frontSpriteSrc(id, isShiny)`(앞모습 경로)와 `getFrontSpriteMetrics(id, isShiny)`(일반/이로치 값을 `x·y·w·h·topSafety·
    effectW·effectH` 같은 이름으로 돌려줌, 데이터가 없으면 null) 추가.
  - `pickRandomMonster()`(`pokemon_catch.js`), `renderDexInfoSprite()`(`pokemon_pokedex.js`), `partyEntryToMonsterObj()`·슬롯
    컨트롤러 `render()`(`pokemon_battle.js`)의 경로 조합을 `frontSpriteSrc`로 교체. `displayMonsterSprite()`·`playShinyEffect()`(`script.js`),
    `renderDexInfoSprite()`, `alignWildMonsterTopToHpBar()`·`playAiFaintAnimation()`·`playBattleEffect()`·슬롯 컨트롤러 `render()`의 실측값 분기를
    `getFrontSpriteMetrics`로 교체. 각 곳의 기존 기본값(데이터가 없을 때 `frameSize`/0 등)은 그대로 유지.
  - 아이콘 경로(`capturedIconSrc`)는 이미 공통 함수라 그대로 두고, 뒷모습(`BACK_SPRITE_OFFSETS`, 폴더별 구조)은 3단계(스프라이트시트 재생)에서
    함께 다룰 예정이라 이번엔 건드리지 않음.
- 검증:
  - 바꾸기 전 식과 바꾼 뒤 공통 함수를 실제 데이터 파일(`pokemon_data.js`, `pokemon_front_sprite_offsets_data.js`)과 함께 jsc로 실행해,
    포켓몬 1,591종 + 없는 id × 일반/이로치 × 프레임 크기 3가지로 경로·크기 보정·위치 보정·이로치 이펙트·상대 배치·랭크업/회복 이펙트 값을
    전부 비교 — 66,858건 중 불일치 0건.
  - 로드 순서대로 이어붙인 전체 스크립트 jsc 문법 검사 통과. 브라우저에서 포획 게임 몬스터·이로치 이펙트, 도감 정보 큰 그림(메가 이로치),
    배틀 선택 슬롯 3칸(메가·이로치·거다이맥스 이로치), 배틀 상대 배치·회복 이펙트·기절 연출을 실행해 스크립트 오류 없이 정상 표시됨을 확인.
  - 수정 전 파일 4개는 작업용 임시 폴더에 백업해 둠.

## 103. 공통 함수 정리 2단계 — HP바 애니메이션·기절 연출을 내 쪽/상대 쪽 공통 함수로 통일

- 사용자 요청 원문: "응 2단계 진행해줘" (102의 추천 순서 ② HP바·기절 연출)
- 원인 분석: `pokemon_battle.js`에 HP바 관련 함수가 상대용(`updateAiHpFillDisplay`/`animateAiHp`/`resetAiHpBar`)과 내 것용
  (`updatePlayerHpFillDisplay`/`animatePlayerHp`/`resetPlayerHpBar`) 두 벌로, 전역 상태(`displayedAiHp`/`aiHpAnimId`/`displayedPlayerHp`/
  `playerHpAnimId`)와 함께 채움 요소만 빼고 줄 단위로 같았음. 기절 연출도 `playAiFaintAnimation`/`playPlayerFaintAnimation`이 땅 라인
  계산·하강 거리·시간·transform 처리까지 같은 코드를 따로 갖고 있었음.
- 구현 내용(동작 변경 없음):
  - `createHpBarController(fillEl)` 추가 — 표시 중인 hp와 진행 중인 애니메이션을 자기 안에 보관하고 `animate(from, to, onDone)`/
    `reset(hp)`/`cancel()`을 제공. `aiHpBar`(채움 요소 `#monster-hp-fill`)와 `playerHpBar`(`#battle-back-hp-fill`) 두 개를 만들어 쓰고,
    옛 함수 6개와 전역 상태 4개를 제거. 호출부(공격·회복·교체·배틀 닫기)를 새 메서드로 교체.
  - `playFaintSink(boxEl, spriteEl, contentHeightOnScreen, onComplete)` 추가 — 땅 라인 clip-path 고정 + 일정 속도 하강의 공통 부분.
    `playAiFaintAnimation`/`playPlayerFaintAnimation`은 각자 이로치 이펙트 정리와 그림 높이 계산만 하고 공통 함수를 부름.
  - `style.css`의 hp바 주석 2곳에 남아 있던 옛 함수 이름(`updatePlayerHpFillDisplay`)을 새 이름으로 수정.
- 검증:
  - 수정 전 코드(백업)와 수정 후 코드를 같은 가짜 화면 요소·가짜 시계로 jsc에서 함께 실행해, HP바에 기록되는 모든 스타일 값(폭·색 구간)과
    완료 콜백 순서를 비교(상대/나 × 연속 애니메이션·같은 값·도중 취소·리셋이 섞인 시나리오 4건) — 불일치 0건. 기절 연출도 상대/나 × 박스
    높이·그림 높이·기존 transform 조합 144건에서 clip-path·transition·transform·완료 시간이 모두 같음(불일치 0건).
  - 로드 순서대로 이어붙인 전체 스크립트 jsc 문법 검사 통과. 브라우저에서 실제 배틀로 상대 공격(내 hp 50 → 막대 34.78%), 회복(100 → 69.57%),
    내 포켓몬 기절(땅 라인·하강 후 강제 교체 메뉴), 교체 후 hp바 리셋, 상대 기절 연출, 상대 교체 후 리셋(hp 40 → 27.83%, 계산값과 일치),
    HP바 애니메이션 도중 배틀 닫기(애니메이션 중단·콜백 미호출)를 확인 — 스크립트 오류 0건.
  - 수정 전 파일은 작업용 임시 폴더에 백업해 둠.

## 104. 공통 함수 정리 3단계 — 스프라이트시트 재생(크기 계산·필름스트립 재생)을 공통 함수로 통일

- 사용자 요청 원문: "공통 함수 정리 3단계 진행해줘" (102의 추천 순서 ③ 스프라이트시트 재생)
- 원인 분석: 앞모습 스프라이트시트를 재생하는 코드가 `displayMonsterSprite`(script.js, 포획 게임·배틀 상대),
  `renderDexInfoSprite`(pokemon_pokedex.js, 도감 정보), `createSlotSpriteController().render`(pokemon_battle.js, 배틀 선택·상태 슬롯)
  세 곳에 프레임 수 판정·정지 이미지 크기 보정(SPRITE_SIZE_REF)·표시 크기·오프셋 이동·프레임 재생까지 줄 단위로 같게 복사돼 있었음.
  뒷모습 `displayBackSprite`도 프레임 재생 부분(drawFrame + setInterval)은 같은 코드였음.
- 구현 내용(동작 변경 없음):
  - `script.js`에 공통 함수 3개 추가:
    - `computeFrontSpriteLayout(id, isShiny, naturalW, naturalH, boxWidth)` — 프레임 수, 정지 이미지 크기 보정, 표시 크기, 오프셋 이동값 계산
    - `applyFrontSpriteLayout(spriteEl, layout)` — 안쪽 레이어의 폭·높이·background-size·transform 적용
    - `startFilmstrip(spriteEl, frameWidth, frameCount)` — 첫 프레임을 그리고 2장 이상이면 재생 타이머 시작(정지 이미지면 null 반환)
  - 앞모습 3곳은 각자 박스 너비 기본값(288/140/60), 로딩 경쟁 방지 확인, 타이머 변수만 갖고 나머지는 공통 함수를 부름.
    `displayMonsterSprite`는 이로치 이펙트용 전역값(`currentMonsterFrameSize`/`currentMonsterDisplaySize`) 저장도 그대로 유지.
  - 뒷모습 `displayBackSprite`는 직사각형 프레임·하단 정렬·폴백 등 규칙이 달라 크기 계산은 그대로 두고, 프레임 재생만 `startFilmstrip`을 씀.
  - 설명 주석은 공통 함수 쪽으로 옮김.
- 검증:
  - 수정 전 코드(백업)와 수정 후 코드를 실제 데이터 파일(POKEMON_DATA, 앞/뒷모습 실측값)과 실제 PNG 크기, 가짜 화면 요소·가짜 타이머로 jsc에서
    함께 실행해 네 함수가 쓰는 모든 스타일 값(폭·높이·background-size·transform·top·프레임별 background-position 순서), 타이머 시작/정지,
    이로치 이펙트 호출·전역값을 비교 — 전체 폼 × 일반/이로치 × 박스 크기 5종 × 이미지 크기 변형 4종(실제/배수 아님/0/높이 절반), 254,580건 불일치 0건.
    일부러 계산을 조금 바꾼 코드로 같은 비교를 돌리면 불일치가 잡히는 것도 확인(비교 장치 자체 검증).
  - 로드 순서대로 이어붙인 전체 스크립트 jsc 문법 검사 통과. 브라우저에서 포획 게임 시작(재생·오프셋 정상), 도감 정보 그림(애니메이션 폼·
    정지 이미지 716 이로치·메가 이로치), 배틀 선택 슬롯, 배틀 시작 후 상대 앞모습·내 이로치 뒷모습 재생, 상태 확인 화면 슬롯 6칸을 확인 — 스크립트 오류 0건.
  - 수정 전 파일은 작업용 임시 폴더에 백업해 둠.

## 105. 도감: 배틀 선택 모드에서 설정 버튼 숨김 + 빈 목록 문구 분리

- 사용자 요청 원문: "선택 모드에서 설정 버튼 숨기고 빈 목록 문구도 나눠줘"
- 원인 분석(배틀 선택 도감과 일반 도감 비교 중 발견):
  - 배틀 선택 모드에서도 좌측 상단 ⚙로 도감 초기화·치트 화면에 들어갈 수 있었음 — 슬롯에 리자몽을 넣고 초기화하면
    목록은 비는데 슬롯에는 이제 잡지 않은 리자몽이 그대로 남았음.
  - 목록이 비면 이유와 상관없이 항상 "검색 결과가 없습니다"가 나와, 검색어 없이 잡은 포켓몬이 0마리일 때(선택 모드, 일반 도감
    "잡음")도 같은 문구가 나왔음.
- 구현 내용:
  - `updateDexPickerBarVisibility()`(pokemon_battle.js): 선택 모드에서 포획 수 줄을 숨기던 것과 같은 방식으로 ⚙ 설정 버튼도 숨김.
    목록 화면으로 돌아올 때마다(`showDexList()`가 마지막에 이 함수를 부름) 다시 숨겨지고, 일반 도감에서는 지금과 같이 보임.
  - `renderDexList()`(pokemon_pokedex.js): 목록이 비었을 때, 잡은 포켓몬만 보는 중(잡음 또는 선택 모드)이고 잡은 종이 하나도 없으면
    "잡은 포켓몬이 없습니다", 그 밖(검색어 때문)이면 "검색 결과가 없습니다". "도감 데이터가 없습니다"(데이터 파일이 비었을 때만
    나오는 방어용 문구)는 그대로 둠.
  - 같은 작업 중 일반 도감에 "메가진화"/"다이맥스" 필터 체크박스도 만들었으나 사용자 요청으로 롤백함(코드·화면에 남은 것 없음).
- 검증:
  - 로드 순서대로 이어붙인 전체 스크립트 jsc 문법 검사 통과.
  - 브라우저: 0마리일 때 선택 모드·일반 "잡음" 모두 "잡은 포켓몬이 없습니다", 없는 이름 검색은 "검색 결과가 없습니다". 선택 모드에서
    ⚙·포획 수 줄 숨김(정보 화면 → 뒤로가기 후에도), 일반 도감을 다시 열면 ⚙ 보이고 설정 → 뒤로가기 정상. 콘솔 오류 0건.
  - 테스트용 포획 데이터는 확인 후 지움. 수정 전 파일은 작업용 임시 폴더에 백업해 둠.

## 106. 코드 전반 버그 점검: 배틀 도중 닫기 후 턴 연쇄 누수, 회복 멘트 조사, 퀴즈 중복 보기

- 사용자 요청 원문: "분석하고 패치진행하자" (대상 확인 질문에 "코드 전반 버그 점검" 선택)
- 원인 분석:
  - 배틀 턴 진행은 메시지 대기·페이드·기절 연출의 setTimeout/Promise 콜백 연쇄인데, ×로 닫아도(`resetBattlePreview()`) 연쇄가 멈추지 않았음.
    막는 장치는 `switchAiToIndex()`의 `battlePreviewActive` 확인뿐이었고, 새 배틀을 곧바로 시작하면 이 값이 다시 true라 그것도 통과함.
    실제 재현: 공격 멘트 도중 닫고 바로 새 배틀 시작 → 옛 타이핑과 새 타이핑이 한 대화창에 글자를 번갈아 붙여 "상을대(가를 )레 지내…"처럼 깨지고,
    닫은 배틀의 공격이 새 배틀에서 이어져 "효과가 굉장했다!"가 뜨며 새 상대 첫 포켓몬이 턴도 없이 hp 48로 시작함.
  - 회복 멘트가 `${attackerName}는`으로 고정돼 받침 있는 이름에서 "리자몽는"처럼 나왔음(다른 멘트는 이(가)/을(를) 병기).
  - 퀴즈 오답 보기를 "정답이 아닌 행"에서 뽑아서, 엑셀에 뜻(B열)이 같은 단어가 여러 줄 있으면 정답과 같은 글자의 보기가 나오거나
    보기끼리 겹침 — 판정이 textContent 비교라 정답 글자를 눌러도 오답이 되거나 정답 표시가 두 칸에 붙음.
- 구현 내용:
  - `typeMessage()`(script.js): 요소별 토큰을 둬서 같은 요소에 새 메시지를 시작하면 이전 타이핑이 멈춤. `cancelTypeMessage()` 추가.
  - `battleSessionId`/`battleCallback()`(pokemon_battle.js): 닫을 때마다 세션 번호를 올리고, 예약 시점 세션이 아니면 콜백을 버림.
    `showBattleMessage()` 완료 콜백, `playFaintSink()` 종료, `switchAiToIndex()`·`applyPlayerSwitch()`의 페이드 Promise/타이머를 감쌈.
    `resetBattlePreview()`가 세션을 올리고 대화창 타이핑을 취소함. `switchAiToIndex()`의 `battlePreviewActive` 확인 2곳은 이걸로 대체.
  - 회복 멘트 2곳을 "은(는)"으로 변경.
  - `pickQuizQuestion()`(pokemon_learning.js): 오답 보기를 정답과 다른 뜻 중 중복 없이 뽑음. 업로드 시 최소 개수도 "뜻이 서로 다른 단어 수"로 셈.
- 검증:
  - 로드 순서대로 이어붙인 전체 스크립트 jsc 문법 검사 통과.
  - 브라우저: 위 재현 절차를 수정 전/후로 실행 — 수정 후 메시지 깨짐 없음, 새 배틀 상대 hp 100 유지, 메인 메뉴 정상 표시.
    이어서 회복→공격으로 승리까지, 결과 화면 "다시하기" → 선택 모드 진입, 저체력으로 패배까지(강제 교체 2회) 진행 — 콘솔 오류 0건,
    "리자몽은(는) 체력을 회복했다!" 확인. 뜻이 겹치는 단어 목록으로 퀴즈 2,000회 출제 시 보기 중복 0건.
  - 수정 전 파일은 작업용 임시 폴더에 백업해 둠.

## 107. 함께하기(초대 코드 1:1 대전) 추가

- 사용자 요청 원문: "멀티 플레이 확장용으로 패치 몇가지 진행할게" — 0) 포켓몬 배틀 → 혼자하기/함께하기 → 초대 코드 생성하기/입력, 생성 시 대기실 창, 입장하면 바로 슬롯 선택창
  1) 선택 완료 후 상대가 아직 고르는 중이면 버튼이 "대기 중"으로 바뀌며 회색 비활성화, 둘 다 완료되면 액션박스에 "불러오는 중" + 프리로드 후 시작
  2) 상대가 사람이면 양쪽이 행동을 다 골랐을 때 진행, 한쪽만 골랐으면 액션박스에 "통신 대기 중"
- 결정 사항(사용자 선택): 통신은 PeerJS(WebRTC P2P, 서버 구축 없음), 결과 화면 "다시하기"는 연결을 유지한 채 같은 상대와 재대결.
- 구현 내용:
  - 새 파일 `pokemon_multiplayer.js`(pokemon_battle.js 바로 앞에 로드) + PeerJS CDN. 연결 계층 `mpSend`/`mpOn`/`mpWaitFor`(먼저 도착한 메시지는 보관했다가 전달)/`mpLeave`/`mpClearInbox`.
    초대 코드는 헷갈리는 글자를 뺀 6자, peer id는 `pkmncatch-<코드>`. 호스트는 두 번째 입장을 거절, 게스트는 "없는 방" 응답을 3번까지 재시도.
  - 시작화면 하위 메뉴 `#battle-mode-menu`/`#battle-together-menu`, 대기실 `#mp-lobby-modal`, 코드 입력 `#mp-join-modal`, 끊김 알림 `#mp-notice-modal`(퀴즈창 디자인 재사용).
  - 선택 완료 핸들러를 `beginBattle(opponentParty)`로 분리(혼자하기는 `pickAiTeam()` 그대로). 함께하기는 파티 전송 후 `mpPartyLocked`로 슬롯·폼 칸·랜덤 선택 잠금.
    둘 다 모이면 `mpPreloadBattleAssets()`(내 뒷모습 3장+폴백, 양쪽 앞모습 6장, 물음표 이미지) → 양쪽 `loaded` 교환 후 기존 등장 연출(`playBattleIntro()`).
  - 턴: `startPlayerTurn()`이 pvp면 `mpSubmitTurnAction()`으로 행동 전송. 호스트가 자기 행동에 이번 턴 판정(`mpRollTurn()` — 선공, 양쪽 명중/치명타)을 실어 보내서,
    양쪽 행동이 모이는 순간 어느 쪽이든 같은 결과로 진행. `resolveSingleAction()`/`runTurnSequence()`에 판정값 인자 추가(AI 배틀은 기존대로 Math.random).
    상대 쪽 상태는 기존 AI 변수(`aiParty`/`activeAiIndex`/`aiRank`)를 그대로 씀.
  - 기절: 내 쪽은 강제 교체 메뉴에서 고르면 `forcedSwitch` 전송, 상대 쪽은 "통신 대기 중"으로 상대의 선택을 기다림(`mpWaitForcedSwitch()`).
  - ×/처음으로/선택창 닫기 = 방 나가기, 상대는 배틀 중이면 "상대와의 통신이 끊어졌다..." 멘트 후 결과 화면(다시하기 숨김), 그 외엔 알림창.
- 검증:
  - 로드 순서대로 이어붙인 전체 스크립트 jsc 문법 검사 통과.
  - 브라우저 탭 2개로 코드 생성→입장→선택창, 한쪽만 선택 완료 시 "대기 중"(회색 #999)·잠금, "불러오는 중..." → 등장 연출, 한쪽만 행동 시 "통신 대기 중...".
    자동 조작으로 공격·랭크업·회복·자진 교체·강제 교체 섞어 16턴 승패까지 — 매 시점 양쪽 hp/랭크/출전 포켓몬이 정확히 대칭, 결과(승/패)도 반대로 일치.
    다시하기 재대결, 배틀 중 ×로 나가기 → 상대 끊김 멘트, 선택창 닫기 → 상대 알림창, 없는 코드 입력 → "방을 찾을 수 없다...", 혼자하기 기존 동작 확인.

## 108. 함께하기 통신을 로컬 창끼리 직접 통신으로 교체(PeerJS 제거)

- 사용자 요청 원문: "그냥 서버안쓰고 로컬환경에서 두개 창을 열어서 할거니까 그거에 맞게 코드 수정해줘" (107 테스트 중 "방을 찾을 수 없다..."가 뜸)
- 구현 내용:
  - PeerJS CDN과 중계서버 의존을 없애고, 같은 브라우저의 창끼리 BroadcastChannel + localStorage storage 이벤트 두 통로로 동시에 주고받음.
    storage 통로는 index.html을 파일로 바로 연(file://) 경우를 위한 것. 두 통로로 온 같은 메시지는 메시지 id로 한 번만 처리.
  - 창마다 고유 id를 두고, 입장 요청(`join`) → 방장 창이 수락(`welcome`)/거절(`full`), 이후 메시지는 짝이 된 상대 창 id끼리만 받음.
  - 코드 입력 후 1.5초 안에 방장 창이 답하지 않으면 "방을 찾을 수 없다...". 창을 닫거나 새로고침하면(`pagehide`) 상대에게 나갔다고 알림.
  - 배틀 쪽 API(`mpSend`/`mpOn`/`mpWaitFor`/`mpLeave`/`mpClearInbox`, `mp.active`/`mp.isHost`)는 그대로라 pokemon_battle.js는 변경 없음.
- 검증:
  - jsc 문법 검사 통과.
  - 브라우저 탭 2개(localhost)에서 BroadcastChannel을 끄고 storage 통로만으로 코드 생성→입장→선택→27턴 승패까지 자동 진행 — 양쪽 hp/결과 대칭 일치.
    패배 직후 한쪽 창 새로고침 → 남은 창에 "상대와의 연결이 끊어졌다..." 알림, 다시하기 숨김.
  - 실제 file://로 연 창 두 개는 브라우저 창 도구가 지원하지 않아 직접 확인하지 못함.

## 109. 함께하기 안내·오류 멘트 다듬기

- 사용자 요청 원문: "코드를 만드는 중...은 코드를 생성하는 중...으로 바꾸고 오류 끊김 멘트 쪽은 포켓몬 도감쪽에 치트 코드 입력 멘트처럼 다듬어줘",
  "변경안을 다른 게임과 비교해서 다시 다듬어봐" → "최종 제안대로 패치 진행해줘"
- 기준: 도감 치트 코드 창처럼 "~습니다" 존댓말에 말줄임표 없이. 포켓몬 본가처럼 대전 연결은 "통신"이라 부르고, 끊김은 시스템 안내(존댓말)로.
- 변경 내용:
  - 대기실 초기값: 코드를 만드는 중... → 코드를 생성하는 중...
  - 짧은 코드 입력: 코드 6자리를 입력해 줘 → 초대 코드 6자리를 입력해 주세요
  - 없는 코드: 방을 찾을 수 없다... → 유효하지 않은 초대 코드입니다
  - 인원 초과: 이미 다른 상대가 들어간 방이다... → 방이 가득 찼습니다
  - 끊김 알림창: 상대와의 연결이 끊어졌다... → 상대와의 통신이 끊어졌습니다
  - 배틀 중 끊김(액션박스): 상대와의 통신이 끊어졌다... → 상대와의 통신이 끊어졌습니다
- 검증: jsc 문법 검사 통과, 브라우저에서 짧은 코드/없는 코드 입력 시 바뀐 문구와 대기실 초기값 확인.

## 110. 대기실 창 크기 흔들림 수정 + 하위 메뉴 뒤로가기 색 통일

- 사용자 요청 원문: "대기실 창에서 상대를 기다리는 중 뒤에 ...이 늘어나면서 대기실 창 자체가 크기가 바뀌는 현상이 있어서 고쳐주고 동시에 이전으로 버튼 색을 다른 색이랑 같게(혼자하기, 함꼐하기랑 같게) 만들어"
- 원인: 점 애니메이션 칸(`.mp-dots`) 폭이 1.5em인데 픽셀 폰트의 "..."(약 22.5px)이 그보다 넓어(14px 기준 21px) 점 3개일 때만 칸 안에서 줄바꿈됨 —
  상태 줄이 2줄이 되며 대기실 창 높이가 매 주기마다 커졌다 줄었다 함.
- 구현 내용:
  - `.mp-dots`: 폭 2em, `white-space: nowrap`, `vertical-align: top`.
  - 하위 메뉴 "뒤로가기" 2개의 회색(`.start-submenu-back`, #666) 클래스와 규칙을 삭제해 혼자하기/함께하기와 같은 검정으로 통일.
- 검증: 점 0~3개 상태마다 대기실 창 크기를 재서 모두 같음을 확인, 뒤로가기/혼자하기 글자색 동일(검정) 확인.

## 111. 기절 후 교체에 "가랏! ~!" 멘트 추가(함께하기 양쪽 타이밍 맞춤)

- 사용자 요청 원문: "기절후 교체했을때 내 포켓몬은 멘트없이 바로나오는데 상대 화면에서는 내보내기 멘트가 나오고 포켓몬이 나와서 타이밍이 안맞아"
- 원인: 내 포켓몬 기절 후 강제 교체는 멘트 없이 바로 `applyPlayerSwitch()`로 등장했지만, 상대 화면은 `switchAiToIndex()`가 "상대가 ~을(를) 내보냈다!" 멘트를 먼저 띄운 뒤 등장시킴.
- 구현 내용: 강제 교체 이름 버튼을 누르면 배틀 시작 등장과 같은 "가랏! ~!" 멘트 후 등장하도록 변경(혼자하기에도 동일 적용 — 원작도 기절 후 교체 시 이 멘트가 나옴). 관련 주석 2곳 갱신.
- 검증: jsc 문법 검사 통과. 브라우저 탭 2개로 함께하기에서 기절 → 강제 교체 진행 — 교체를 고른 순간 내 화면 "가랏! 리자몽!"과 상대 화면
  "상대가 리자몽을(를) 내보냈다!"가 같은 시점(약 0.1초 차)에 시작됨. 문구 길이 차이로 등장은 약 0.4초 차(배틀 시작 등장과 같은 수준).

## 112. 함께하기 다시하기를 양쪽 동의 방식으로 변경

- 사용자 요청 원문: "다시하기 누르면 선택 완료 처럼 대기 중으로 나타나고 상대도 다시하기가 누르면 함께 배틀 포켓몬 선택 슬롯 창으로 이동하게 하는건어때",
  "상대가 내가 다시하기 버튼 누르기 전에 나가면 해당 버튼이 비활성화 되게 하고 대기 중 상태에서 나가면 대기 중이라는 멘트가 상대와의 통신이 끊어졌습니다로 표시되도록 해 별도 알림창 사용하지 말고"
- 구현 내용:
  - 함께하기 결과 화면 "다시하기": 누르면 "대기 중"(회색 비활성화) + `rematch` 전송, 상대의 `rematch`가 오면(먼저 와 있으면 즉시) 둘 다 선택창으로 이동. 혼자하기는 기존대로 바로 이동.
  - 상대가 나갔을 때(`mpOnDisconnect`): 다시하기를 숨기던 것을 회색 비활성화로 변경. 대기 중이었다면 버튼 문구를 "상대와의 통신이 끊어졌습니다"로 바꿈.
    결과 화면에서는 별도 알림창을 띄우지 않음. 배틀 도중 끊김도 결과 화면에서 다시하기가 숨김 대신 비활성화로 보임.
  - `mpRematchWaiting` 상태 추가, `resetBattlePreview()`에서 버튼 문구/활성 상태 복원.
- 검증: jsc 문법 검사 통과. 브라우저 탭 2개로 확인 — ① 한쪽이 먼저 누르면 "대기 중"(#999), 상대가 누르면 둘 다 선택창 이동
  ② 누르기 전에 상대가 처음으로 → 다시하기 회색 비활성화, 알림창 없음 ③ 대기 중에 상대가 처음으로 → 버튼 문구가 "상대와의 통신이 끊어졌습니다", 알림창 없음.

## 113. 함께하기 선택창 끊김을 알림창 대신 버튼 자리 안내로 표시

- 사용자 요청 원문: "선택창에서 x를 눌러 나가면 상대 화면에서는 슬롯 선택창의 선택완료(또는 대기 중) 버튼과 랜덤 선택 버튼이 비활성화 되며 상대와의 통신이 끊어졌습니다로 바뀌고 액션박스 '상대와의 통신이 끊어졌습니다' → 결과 화면(다시하기 비활성화) 처럼 시작화면으로 이동"
- 구현 내용:
  - 선택창에서 상대가 나가면(`mpOnDisconnect`) 파티 잠금 + 선택 완료(또는 대기 중) 버튼을 "상대와의 통신이 끊어졌습니다"(회색 비활성화)로 바꾸고,
    1.5초(`MP_PICKER_DISCONNECT_HOLD_MS`) 뒤 선택창을 닫고 시작화면으로. 별도 알림창은 띄우지 않음. 그 사이 직접 ×로 닫으면 타이머는 무시.
  - 문구(232px)와 랜덤 선택(75px)이 버튼 줄 폭(264px)에 한 줄로 안 들어가 창 밖으로 넘쳐서, 안내하는 동안만 랜덤 선택을 숨김(사용자 선택).
  - `mpPickerDisconnected` 상태 추가, 선택창을 새로 열거나 닫을 때 초기화.
- 검증: jsc 문법 검사 통과. 브라우저 탭 2개로 한쪽 선택창 × → 상대 화면에 안내 문구(버튼 줄 264/264px로 넘침 없음)·알림창 없음, 1.6초 후 시작화면,
  이어서 혼자하기 선택창에서 랜덤 선택/선택 완료 정상 복원 확인.

## 114. 결과·시작 화면으로 넘어가기 전 머무는 시간을 1초로 통일

- 사용자 요청 원문: "결과 화면이나 시작 화면으로 넘어가기 전 머무는 시간을 1초로 통일한다는 거야 맞지?" → "응 진행해줘"
- 기존: 승패·배틀 중 끊김 멘트는 일반 배틀 멘트와 같은 0.65초(`BATTLE_MESSAGE_HOLD`), 함께하기 선택창 끊김 안내는 1.5초로 제각각이었음.
- 구현 내용:
  - `BATTLE_SCREEN_TRANSITION_HOLD = 1000` 추가, `showBattleMessage()`에 대기시간 인자(`hold`, 생략 시 기존 0.65초) 추가.
  - 승패 멘트(`endBattleWithResult()` — 혼자하기에도 적용)와 배틀 중 끊김 멘트가 이 값을 씀. 선택창 끊김(`MP_PICKER_DISCONNECT_HOLD_MS`)도 같은 값으로 연결.
  - 일반 배틀 멘트의 0.65초와 타이핑 속도는 그대로.
- 검증: jsc 문법 검사 통과. 브라우저 실측(문구가 다 보인 뒤 → 화면 전환): 이겼다 1,059ms / 졌다 1,062ms / 통신 끊김 1,060ms
  (마지막 글자 뒤 타이핑 한 칸 42ms 포함, 기존과 동일한 구조), 일반 멘트는 707ms로 변화 없음. 선택창 끊김은 즉시 표시 후 1,000ms.

## 115. 함께하기 선택창 끊김 안내 → 시작 화면 시간을 1.5초로

- 사용자 요청 원문: "상대와의 통신이 끊어졌습니다 (선택창) 에서 시작 화면까지는 1.5초로 해줘"
- 구현 내용: 114에서 `BATTLE_SCREEN_TRANSITION_HOLD`(1초)에 연결했던 `MP_PICKER_DISCONNECT_HOLD_MS`를 별도 값 1500ms로 분리. 승패·배틀 중 끊김 멘트는 1초 그대로.
- 검증: jsc 문법 검사 통과.

## 116. 함께하기 입장을 3단계 확인(3-way handshake)으로 변경

- 사용자 요청 원문: "동시에 버튼을 눌러 문제되는 상황이 있는지 확인해서 정리해줘" → "이렇게 하는게 업계의 표준화된 방식이야?" → "응 3단계 확인으로 진행해줘"
- 원인: 방장이 입장 요청(`join`)을 받는 즉시 수락(`welcome`)을 보내고 선택창으로 넘어가서, 입장 쪽이 그 직전에 입장 창 ×를 누르거나 1.5초 시간 초과가 나면
  방장만 혼자 선택창에서 오지 않을 상대를 기다리고 끊김 안내도 뜨지 않았음.
- 구현 내용(pokemon_multiplayer.js):
  - ① 입장 쪽 `join` → ② 방장 `welcome`(방장은 대기실에 머문 채 확인 대기, `mp.pendingGuestId`) → ③ 입장 쪽 `ack`(이때 입장 쪽 선택창으로) → 방장이 `ack`를 받으면 선택창으로.
  - 입장 쪽이 이미 취소·시간 초과된 뒤 `welcome`이 오면 `decline`을 보내고, 방장은 확인 대기만 풀고 대기실에서 계속 기다림.
  - `decline`도 못 받으면 3초(`MP_HANDSHAKE_TIMEOUT_MS`, 입장 쪽 시간 초과 1.5초보다 길게) 뒤 확인 대기를 풂. 확인 대기 중 다른 창의 입장은 "방이 가득 찼습니다".
  - 늦게 온 `ack`: 방장이 같은 코드로 빈 방을 열어두고 있으면 그대로 받아들이고, 방을 닫았거나 다른 상대와 짝이 됐으면 입장 쪽에 `leave`를 보내
    그쪽 선택창을 끊김 안내 → 시작화면으로 정리시킴.
- 검증: jsc 문법 검사 통과. 브라우저 탭 2개로 확인 — ① 정상 입장(join→welcome→ack) ② 입장 요청 직후 취소 → 방장 `decline` 수신, 대기실 유지, 이어서 정상 입장 성공
  ③ 응답 없는 유령 입장 요청 → 확인 대기 중 다른 창 "방이 가득 찼습니다", 3초 뒤 같은 창 입장 성공
  ④ 방장이 대기실을 닫은 뒤 늦게 온 확인 → 입장 쪽 선택창에 끊김 안내 후 시작화면, 알림창 없음.

## 117. 함께하기 알림창 삭제

- 사용자 요청 원문: "그럼 이제 알림창은 사용하지 않는거지?" → "응 삭제해줘"
- 이유: 113·112로 끊김 안내가 전부 버튼·액션박스 문구로 바뀌었고, 연결은 항상 선택창을 열면서 시작되어 선택창 → 배틀 → 결과 화면 → 선택창으로만
  이어지므로 알림창이 뜨는 경로(배틀 쪽 훅이 처리하지 않는 상태)가 사실상 없었음.
- 구현 내용: `#mp-notice-modal`(index.html), `showMpNotice()`/확인 버튼 처리(pokemon_multiplayer.js), `.mp-notice-ok-btn`(style.css) 삭제.
  `mpHandleRemoteGone()`은 연결 정리 후 `mpOnDisconnect()`만 부르고, `mpOnDisconnect`의 true/false 반환값(알림창 여부)도 없앰.
- 검증: jsc 문법 검사 통과. 브라우저 탭 2개로 선택창 × → 상대 화면 끊김 안내 → 1.5초 후 시작화면, 스크립트 오류 0건.

## 다음 패치 후보 (미구현)

- 공/방/특공/특방/스피드 종족치 반영 — 지금은 선공권이 완전 랜덤이고 데미지도 상성 배율만 적용됨. 종족치가 들어가면 스피드로 선공권을 정하고, AI 팀 구성도 지금의 랜덤 대신 내 파티와 종족치가 비슷하게 맞춰 구성할 예정(사용자 확인 완료).
- 포켓몬별 고유 기술 세트 — 지금은 공격이 "그 포켓몬 자신의 타입"으로만 계산되는 범용 공격 하나뿐이라, 모든 포켓몬이 똑같은 상성으로 싸움(물리/특수 구분은 패치77에서 통합됨). 포켓몬 개체별로 실제로 배우는 고유 기술, PP, 기술별 명중률, 랭크업 외의 다른 부가효과(상태이상 등)는 아직 미반영(현재 명중률/치명타는 모든 공격에 공통 적용되는 전역 수치).
- 배틀에 학습 퀴즈 연동(퀴즈 엔진은 `setQuizAnswerHandlers` 콜백 구조라 재사용 가능) — 기존 "충전하기" 자리는 "상태 확인"이 차지했으므로 연동 방식(버튼 위치/보상)부터 새로 정해야 함.
- 온라인/네트워크 멀티플레이 확장(다른 기기끼리 대전) — 지금 함께하기는 같은 브라우저 창끼리만 통신함(108, BroadcastChannel + localStorage).
  확장할 때는 `pokemon_multiplayer.js`의 `mpPost()`/`mpReceive()` 두 곳만 네트워크 통신(PeerJS·WebSocket 서버 등)으로 바꾸면 되고, 배틀 쪽 API와
  3단계 확인 입장(116)·호스트 판정 방식은 그대로 쓸 수 있음. 함께 고려할 것:
  - 하트비트(주기적 생존 신호) 필수 — 지금은 창 닫기·새로고침 때 보내는 "나감"(`pagehide`)으로만 끊김을 알아채는데, 기기가 다르면 상대 쪽 브라우저 강제 종료·
    절전·와이파이 끊김처럼 "나감"을 못 보내는 비정상 종료가 흔함. 보통 1~5초 간격 전송 + 간격의 약 3배 제한 시간(2~3번 누락 허용). 핑-퐁 방식이면 지연도 측정 가능.
  - 가려진 탭 타이머 지연 주의 — 크롬은 가려진 탭 타이머를 최대 1초에 1번, 5분 넘게 가려지면 1분에 1번까지 늦춤. 멀쩡한 연결을 끊김으로 오판하지 않도록
    제한 시간을 넉넉히 잡거나, 창이 다시 보일 때(`visibilitychange`) 즉시 신호를 보내 판정을 되돌리는 처리가 필요함.
  - 중계서버 의존 — PeerJS 공개 서버는 무료지만 방장 등록이 끊기면 "방을 찾을 수 없음"이 날 수 있었음(107 테스트). 끊기면 재등록(`reconnect`) 처리,
    엄격한 네트워크(회사·학교망)에서 직접 연결이 막히는 경우 대비(TURN 서버) 검토.
  - 메시지 순서·유실 — 지금은 같은 브라우저라 순서가 보장되지만, 네트워크에서는 신뢰성 있는(순서 보장) 채널을 쓰거나 턴 번호(`mpTurn`)로 검증을 강화해야 함.
