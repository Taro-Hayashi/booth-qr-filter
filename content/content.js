(function() {
  'use strict';

  const NAMESPACE = 'booth-qr-filter';
  const TAB_CONTAINER_CLASS = `${NAMESPACE}-tab-container`;
  const TAB_CLASS = `${NAMESPACE}-tab`;
  const HIDDEN_CLASS = `${NAMESPACE}-hidden`;
  const CURRENT_CLASS = 'current';
  const HASH_KEY = 'qr-issued';

  let isFilterActive = false;

  // QRコード発行済み判定
  function isQrIssued(card) {
    const buttons = Array.from(card.querySelectorAll('.btn, a.btn, button'));
    
    let hasShippingNotice = false;
    let hasShippingCodeGen = false;

    buttons.forEach(btn => {
      const text = btn.textContent.trim();
      if (text === '発送完了を通知') {
        hasShippingNotice = true;
      }
      if (text === '発送コードを発行する') {
        hasShippingCodeGen = true;
      }
    });

    return hasShippingNotice && !hasShippingCodeGen;
  }

  // フィルタの適用（表示・非表示の切り替え）
  function applyFilter() {
    // クラス名が一時変更されている可能性も考慮して両方で取得
    const tables = document.querySelectorAll('div.manage-list-table, div.booth-qr-filter-temp-hidden-table');
    
    tables.forEach(table => {
      table.classList.remove(HIDDEN_CLASS);
      table.classList.remove('booth-qr-filter-temp-hidden-table');
      if (!table.classList.contains('manage-list-table')) {
        table.classList.add('manage-list-table');
      }
    });

    if (!isFilterActive) {
      return;
    }

    tables.forEach(table => {
      const card = table.querySelector('.mobile-full-basis');
      if (card) {
        const isTarget = isQrIssued(card);
        if (!isTarget) {
          table.classList.add(HIDDEN_CLASS);
          table.classList.remove('manage-list-table');
          table.classList.add('booth-qr-filter-temp-hidden-table');
        }
      } else {
        // 本体カードが含まれないテーブルも非表示・クラス退避
        table.classList.add(HIDDEN_CLASS);
        table.classList.remove('manage-list-table');
        table.classList.add('booth-qr-filter-temp-hidden-table');
      }
    });
  }

  // ハッシュ状態のチェックと反映
  function checkHashAndApply() {
    const hasHash = window.location.hash === `#${HASH_KEY}`;
    const isPaidPage = window.location.search.includes('state=paid');

    // 「未発送」ページかつハッシュがある場合のみフィルタをアクティブにする
    if (isPaidPage && hasHash) {
      isFilterActive = true;
    } else {
      isFilterActive = false;
    }

    // タブのアクティブ状態の更新
    const myTabLink = document.querySelector(`.${TAB_CLASS}`);
    if (myTabLink) {
      const tabList = document.querySelector('nav.ui-segmented-tablet-nav.centered > ul');
      if (isFilterActive) {
        myTabLink.classList.add(CURRENT_CLASS);
        
        // 他のすべてのタブから current クラスを除去
        if (tabList) {
          const allTabs = tabList.querySelectorAll('a.nav-item');
          allTabs.forEach(tab => {
            if (!tab.classList.contains(TAB_CLASS)) {
              tab.classList.remove(CURRENT_CLASS);
              if (tab.parentElement && tab.parentElement.tagName.toLowerCase() === 'li') {
                tab.parentElement.classList.remove(CURRENT_CLASS);
              }
            }
          });
        }
      } else {
        myTabLink.classList.remove(CURRENT_CLASS);
        
        // フィルタ解除時、URLのパラメータに合致する本来のタブに current クラスを戻す
        if (tabList) {
          const currentPath = window.location.pathname + window.location.search;
          const allTabs = tabList.querySelectorAll('a.nav-item');
          allTabs.forEach(tab => {
            const hrefAttr = tab.getAttribute('href');
            if (hrefAttr && hrefAttr !== '#' && currentPath.includes(hrefAttr)) {
              tab.classList.add(CURRENT_CLASS);
              if (tab.parentElement && tab.parentElement.tagName.toLowerCase() === 'li') {
                tab.parentElement.classList.add(CURRENT_CLASS);
              }
            }
          });
        }
      }
    }

    applyFilter();
  }

  // タブの動的挿入
  function injectTab() {
    const tabList = document.querySelector('nav.ui-segmented-tablet-nav.centered > ul');
    if (!tabList) return;

    // 既にタブが存在する場合は状態更新だけ行う
    const existingTabContainer = document.querySelector(`.${TAB_CONTAINER_CLASS}`);
    if (existingTabContainer) {
      checkHashAndApply();
      return;
    }

    // 「未発送」タブ（href が /orders?state=paid のもの）を特定
    const paidTabLink = document.querySelector('a[href="/orders?state=paid"]');
    if (!paidTabLink) return;
    
    const paidTabLi = paidTabLink.parentElement;
    if (!paidTabLi || paidTabLi.tagName.toLowerCase() !== 'li') return;

    // 新しいタブ要素の作成
    const newTabLi = document.createElement('li');
    newTabLi.className = TAB_CONTAINER_CLASS;

    const newTabLink = document.createElement('a');
    newTabLink.className = `nav-item ${TAB_CLASS}`;
    newTabLink.href = '#';
    newTabLink.textContent = 'QRコード発行済み';

    // クリックイベントの設定
    newTabLink.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();

      const isPaidPage = window.location.search.includes('state=paid');
      if (isPaidPage) {
        // すでに未発送ページなら、ハッシュを付与してフィルタ適用（戻るボタンで元の未発送一覧に戻れる）
        window.location.hash = HASH_KEY;
      } else {
        // 他のページなら、未発送ページに遷移しつつハッシュを付与
        window.location.href = `/orders?state=paid#${HASH_KEY}`;
      }
    });

    newTabLi.appendChild(newTabLink);

    // 「未発送」タブの直後に挿入
    paidTabLi.after(newTabLi);

    // 既存タブクリック時に対策としてフィルタ状態を一時的に解除するよう紐付け
    const originalTabLinks = tabList.querySelectorAll(`a.nav-item:not(.${TAB_CLASS})`);
    originalTabLinks.forEach(link => {
      if (!link.dataset.filterHandled) {
        link.dataset.filterHandled = 'true';
        link.addEventListener('click', function() {
          isFilterActive = false;
          newTabLink.classList.remove(CURRENT_CLASS);
          applyFilter();
        });
      }
    });

    checkHashAndApply();
  }

  // 初期化と監視
  function init() {
    injectTab();

    // ブラウザの戻る・進む、またはハッシュ書き換えに対応
    window.addEventListener('hashchange', checkHashAndApply);

    const observer = new MutationObserver((mutations) => {
      let shouldProcess = false;
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0) {
          shouldProcess = true;
          break;
        }
      }

      if (shouldProcess) {
        injectTab();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
