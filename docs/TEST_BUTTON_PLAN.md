# Test 버튼 구현 계획

## 배경

현재 사이드패널의 각 셀렉터 행 구조:
```
[ Label ] [ 셀렉터 텍스트(code) ] [ ✓/✗ ] [ Copy ]
```

**문제**: 텍스트 박스(code 요소)를 클릭해도 복사가 되므로, 오른쪽 Copy 버튼이 중복 기능이다.

**목표**: Copy 버튼을 **Test 버튼**으로 교체하여, 해당 셀렉터로 실제 요소를 찾아 `.click()`을 실행하는 기능을 추가한다.

---

## 실현 가능성 분석

### 핵심 질문: 사이드패널에서 웹페이지의 요소를 클릭할 수 있는가?

**답: 가능하다.**

이미 `content.js`에 메시지 핸들러가 있고, `background.js`가 사이드패널 ↔ content script 간 메시지를 중계하고 있다.
기존 `VALIDATE_SELECTOR` 메시지처럼 새로운 메시지 타입 `TEST_CLICK_SELECTOR`를 추가하면 된다.

### 통신 흐름
```
사이드패널 (Test 버튼 클릭)
  → chrome.runtime.sendMessage({ type: 'TEST_CLICK_SELECTOR', data: { selector, isXPath } })
  → background.js (중계)
  → chrome.tabs.sendMessage(tabId, message)
  → content.js (실제 요소 찾아서 .click() 실행)
  → sendResponse({ success: true/false, error? })
```

### 기존 인프라 활용
- `VALIDATE_SELECTOR` 패턴을 그대로 재사용
- `background.js`의 메시지 라우팅 로직 확장
- `content.js`의 switch 문에 새 case 추가

---

## 구현 단계

### 1단계: content.js - TEST_CLICK_SELECTOR 핸들러 추가

**파일**: `content.js` (switch 문, ~줄 147 이후)

```javascript
case 'TEST_CLICK_SELECTOR': {
    const { selector, isXPath } = message.data;
    let element = null;
    try {
        if (isXPath) {
            const result = document.evaluate(
                selector, document, null,
                XPathResult.FIRST_ORDERED_NODE_TYPE, null
            );
            element = result.singleNodeValue;
        } else {
            element = document.querySelector(selector);
        }

        if (element) {
            element.click();
            sendResponse({ success: true });
        } else {
            sendResponse({ success: false, error: 'Element not found' });
        }
    } catch (e) {
        sendResponse({ success: false, error: e.message });
    }
    break;
}
```

### 2단계: background.js - 메시지 라우팅 추가

**파일**: `background.js` (~줄 123, `VALIDATE_SELECTOR` 블록 아래)

`VALIDATE_SELECTOR`와 동일한 패턴으로 `TEST_CLICK_SELECTOR` 추가:

```javascript
else if (message.type === 'TEST_CLICK_SELECTOR') {
    (async () => {
        const tabId = await getCollectingTabId();
        if (tabId) {
            try {
                const response = await chrome.tabs.sendMessage(tabId, message);
                sendResponse(response);
            } catch (e) {
                sendResponse({ success: false, error: e.message });
            }
        } else {
            sendResponse({ success: false, error: 'Not collecting' });
        }
    })();
    return true;
}
```

### 3단계: sidepanel.js - Copy 버튼을 Test 버튼으로 교체

**파일**: `sidepanel.js`

#### 3-1. 버튼 생성 변경 (~줄 156-160)
```javascript
// 기존: Copy Button
// const copyBtn = document.createElement('button');
// copyBtn.className = 'copy-btn';
// copyBtn.textContent = 'Copy';
// copyBtn.dataset.selector = value;

// 변경: Test Button
const testBtn = document.createElement('button');
testBtn.className = 'test-btn';
testBtn.textContent = 'Test';
testBtn.dataset.selector = value;
testBtn.dataset.isXpath = (key === 'xpath' || key === 'textXpath') ? 'true' : 'false';
```

#### 3-2. 이벤트 위임 변경 (~줄 441-446)
```javascript
// 기존: Copy 이벤트 위임
// selectorsGrid.addEventListener('click', async (e) => {
//     const copyBtn = e.target.closest('.copy-btn');
//     if (!copyBtn) return;
//     await copyToClipboard(copyBtn.dataset.selector, copyBtn);
// });

// 변경: Test 이벤트 위임
selectorsGrid.addEventListener('click', async (e) => {
    const testBtn = e.target.closest('.test-btn');
    if (!testBtn) return;

    const selector = testBtn.dataset.selector;
    const isXPath = testBtn.dataset.isXpath === 'true';

    testBtn.textContent = '...';
    testBtn.disabled = true;

    try {
        const response = await chrome.runtime.sendMessage({
            type: 'TEST_CLICK_SELECTOR',
            data: { selector, isXPath }
        });

        if (response && response.success) {
            testBtn.textContent = 'OK!';
            testBtn.classList.add('test-success');
        } else {
            testBtn.textContent = 'Fail';
            testBtn.classList.add('test-fail');
        }
    } catch (err) {
        testBtn.textContent = 'Err';
        testBtn.classList.add('test-fail');
    }

    setTimeout(() => {
        testBtn.textContent = 'Test';
        testBtn.disabled = false;
        testBtn.classList.remove('test-success', 'test-fail');
    }, 1500);
});
```

### 4단계: sidepanel.css - 스타일 변경

**파일**: `sidepanel.css`

기존 `.copy-btn` 스타일을 `.test-btn`으로 변경하고, 성공/실패 상태 스타일 추가:

```css
.test-btn {
    font-family: var(--font-sans);
    font-size: 10px;
    font-weight: 500;
    padding: 3px 8px;
    border-radius: 4px;
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text-tertiary);
    cursor: pointer;
    transition: all 0.12s ease;
    letter-spacing: 0.01em;
}

.test-btn:hover {
    background: var(--accent-muted);
    color: var(--accent);
    border-color: var(--accent);
}

.test-btn.test-success {
    background: rgba(34, 197, 94, 0.15);
    color: #22c55e;
    border-color: #22c55e;
}

.test-btn.test-fail {
    background: rgba(239, 68, 68, 0.15);
    color: #ef4444;
    border-color: #ef4444;
}
```

---

## 수정 파일 목록

| 파일 | 변경 내용 |
|------|----------|
| `content.js` | `TEST_CLICK_SELECTOR` case 추가 |
| `background.js` | 메시지 라우팅 추가 |
| `sidepanel.js` | Copy → Test 버튼 변경, 이벤트 핸들러 변경 |
| `sidepanel.css` | `.copy-btn` → `.test-btn` 스타일 교체 |

---

## 리스크 및 고려사항

| 리스크 | 수준 | 대응 |
|--------|------|------|
| 수집 중이 아닐 때 Test 클릭 | LOW | `Not collecting` 에러 처리 → "Fail" 표시 |
| `.click()`이 페이지 이동을 유발할 수 있음 | MEDIUM | 사용자가 인지하고 사용해야 함 (의도된 동작) |
| XPath 셀렉터의 `.click()` 지원 | LOW | `document.evaluate`로 찾은 요소도 `.click()` 가능 |
| 텍스트 박스 클릭 복사 기능 유지 | NONE | 기존 code 요소 클릭 복사는 그대로 유지 |

---

## 예상 복잡도: LOW

4개 파일에 소규모 변경. 기존 `VALIDATE_SELECTOR` 패턴을 거의 그대로 재사용하므로 구현이 간단하다.
