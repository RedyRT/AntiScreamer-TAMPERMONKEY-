// ==UserScript==
// @name         Smart Anti-Jumpscare Shield v10
// @namespace    http://tampermonkey.net/
// @version      2026-03-01
// @description  Блокирует скримеры, восстанавливает правую кнопку мыши и не дает контенту исчезать.
// @author       You
// @match        https://*/*
// @exclude      *://*.youtube.com/*
// @exclude      *://youtube.com/*
// @exclude      *://*.twitch.tv/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    // 1. ПРИНУДИТЕЛЬНОЕ ВОССТАНОВЛЕНИЕ КОНТЕКСТНОГО МЕНЮ
    window.addEventListener('contextmenu', function(e) {
        e.stopPropagation();
    }, true);

    // 2. БЛОКИРОВКА ДВИЖЕНИЯ ОКНА
    window.moveTo = function() { };
    window.resizeTo = function() { };
    window.focus = function() { };

// 3. БЛОКИРОВКА ВСПОМОГАТЕЛЬНЫХ ОКОН (Popups) - УСИЛЕННАЯ УМНАЯ ВЕРСИЯ
    const originalOpen = window.open;
    let lastPopupTime = 0;

    window.open = function(url, target, features) {
        const now = Date.now();

        // Защита 1: Блокируем клонирование самого себя (главный трюк этого скримера)
        // Скример передает location.href или пустую строку
        if (url === location.href || url === window.location.pathname || !url) {
            showGuardianAlert("Заблокирован спам-клон текущего окна");
            // Возвращаем пустышку, чтобы его w.resizeTo и w.moveTo не выдали ошибку и не сломали скрипт
            return { focus: () => {}, resizeTo: () => {}, moveTo: () => {}, location: { href: "" }, close: () => {} };
        }

        // Защита 2: Лимит на открытие (не больше 1 окна в секунду)
        if (now - lastPopupTime < 1000) {
            console.warn("[Shield] Заблокирован спам окнами (слишком часто)");
            return { focus: () => {}, resizeTo: () => {}, moveTo: () => {}, location: { href: "" }, close: () => {} };
        }

        // Защита 3: Разрешаем окно, если был реальный клик (нужно для Ozon)
        if (window.event && window.event.isTrusted) {
            lastPopupTime = now;
            return originalOpen.apply(this, arguments);
        }

        // Если сайт пытается открыть окно сам по себе в фоне без клика
        showGuardianAlert("Попытка скрытого открытия Popup окна");
        return { focus: () => {}, resizeTo: () => {}, moveTo: () => {}, location: { href: "" }, close: () => {} };
    };

    // 4. ЗАЩИТА ОТ УДЕРЖАНИЯ (beforeunload)
    const originalAddEventListener = window.addEventListener;
    window.addEventListener = function(type, listener, options) {
        if (type === 'beforeunload' || type === 'unload') return;
        if (type === 'contextmenu' && typeof listener === 'function') {
             console.warn("[Shield] Вредоносный обработчик правой кнопки заблокирован");
             return;
        }
        return originalAddEventListener.apply(this, arguments);
    };
    Object.defineProperty(window, 'onbeforeunload', { get: () => null, set: () => null, configurable: false });
    Object.defineProperty(window, 'oncontextmenu', { get: () => null, set: () => null, configurable: false });

    // 5. ФУНКЦИЯ ВЫВОДА АЛЕРТА
    function showGuardianAlert(reason) {
        if (document.getElementById("guardian-root")) return;
        const host = document.createElement("div");
        host.id = "guardian-root";
        host.style = "position:fixed; top:0; left:0; width:100vw; height:0; z-index:2147483647; pointer-events:none;";
        document.documentElement.appendChild(host);
        const shadow = host.attachShadow({ mode: 'closed' });
        const ui = document.createElement("div");
        ui.innerHTML = `
            <div class="card">
                <div class="icon">🛡️</div>
                <div class="info">
                    <div class="title">ЗАЩИТА СРАБОТАЛА</div>
                    <div class="reason">Действие: <b>${reason}</b></div>
                </div>
                <button class="close-btn">УЙТИ ОТСЮДА</button>
            </div>
            <style>
                .card {
                    all: initial !important; position: fixed !important; top: 20px !important; left: 50% !important;
                    transform: translateX(-50%) !important; background: #0a0a0a !important; color: #fff !important;
                    border: 2px solid #ff3333 !important; padding: 15px 25px !important; border-radius: 10px !important;
                    display: flex !important; align-items: center !important; gap: 20px !important;
                    box-shadow: 0 0 40px rgba(255,0,0,0.5) !important; font-family: sans-serif !important;
                    pointer-events: auto !important; min-width: 450px !important; animation: slideDown 0.3s ease-out !important;
                }
                .icon { font-size: 30px !important; }
                .title { font-weight: bold !important; font-size: 16px !important; }
                .reason { color: #aaa !important; font-size: 13px !important; margin-top: 4px !important; }
                .close-btn { background: #cc0000 !important; color: #fff !important; border: none !important; padding: 10px 15px !important; border-radius: 5px !important; cursor: pointer !important; }
                @keyframes slideDown { from { transform: translateX(-50%) translateY(-100px); } }
            </style>
        `;
        shadow.appendChild(ui);
        shadow.querySelector('.close-btn').onclick = () => { window.location.href = "http://www.google.com/"; };
    }

    // 6. УМНАЯ ОЧИСТКА (ДОБАВЛЕНЫ СЕЛЕКТОРЫ НОВОГО СКРИМЕРА)
    function cleanUpScreamer() {
        document.querySelectorAll("audio, video").forEach(el => {
            el.pause(); el.src = ""; el.remove();
        });
        // Добавлены #scary-image и #background-sound
        const badSelectors = ['#overlayImage', '#backgroundAudio', '#overlay', '.scare', '.overlay', 'audio[autoplay]', '#scary-image', '#background-sound'];
        badSelectors.forEach(s => {
            document.querySelectorAll(s).forEach(el => el.remove());
        });
        document.body.style.overflow = "auto";
        document.body.style.display = "block";
    }

    // 7. ОБРАБОТКА КЛИКОВ
    document.addEventListener("click", (e) => {
        const triggerIds = ['contactLink', 'accept-button', 'decline-button', 'ACCEPT', 'DECLINE'];
        if (triggerIds.includes(e.target.id) || triggerIds.includes(e.target.innerText.toUpperCase())) {
            e.preventDefault();
            e.stopPropagation();
            cleanUpScreamer();
            showGuardianAlert("Нажата кнопка-активатор скримера");
        }
    }, true);

    // 8. ПЕРЕХВАТ СОЗДАНИЯ АУДИО (через setAttribute)
    const originalCreateElement = document.createElement;
    document.createElement = function(tagName) {
        const el = originalCreateElement.apply(this, arguments);
        if (tagName.toLowerCase() === 'audio' || tagName.toLowerCase() === 'video') {
            const originalSetAttribute = el.setAttribute;
            el.setAttribute = function(name, value) {
                if (name === 'src' && (value.includes('sounds') || value.includes('mp3') || value.includes('boo') || value.includes('scary'))) {
                    showGuardianAlert("Заблокирована загрузка звука скримера");
                    return;
                }
                return originalSetAttribute.apply(this, arguments);
            };
        }
        return el;
    };

    // 9. АКТИВНЫЙ МОНИТОРИНГ DOM (Уничтожение оверлеев с картинками на лету)
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1) {
                    // Добавлены ID из нового скримера
                    if (node.id === 'overlayImage' || node.id === 'backgroundAudio' || node.id === 'scary-image' || node.id === 'background-sound') {
                        node.remove();
                        showGuardianAlert(`Удален вредоносный элемент: ${node.id}`);
                    }
                    if (node.tagName === 'DIV') {
                        const style = window.getComputedStyle(node) || node.style;
                        if (style && style.position === 'fixed' && style.zIndex >= 99999) {
                            if (node.style.background.includes('url') || node.style.backgroundImage.includes('url')) {
                                node.remove();
                                document.body.style.overflow = "auto";
                                showGuardianAlert("Заблокирован полноэкранный скример-оверлей");
                            }
                        }
                    }
                }
            });
        });
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    // 10. ПЕРЕХВАТ ПРЯМОГО НАЗНАЧЕНИЯ АУДИО (audio.src = ...)
    const originalAudioSrc = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src');
    if (originalAudioSrc) {
        Object.defineProperty(HTMLMediaElement.prototype, 'src', {
            set: function(value) {
                if (typeof value === 'string' && (value.includes('sounds') || value.includes('mp3') || value.includes('boo') || value.includes('scary'))) {
                    showGuardianAlert("Заблокировано прямое назначение звука скримера");
                    return;
                }
                return originalAudioSrc.set.call(this, value);
            },
            get: originalAudioSrc.get,
            configurable: true
        });
    }

    // ======================================================================
    // НОВЫЕ МОДУЛИ ЗАЩИТЫ v9
    // ======================================================================

    // 11. БЛОКИРОВКА FULLSCREEN
    const originalRequestFullscreen = Element.prototype.requestFullscreen;
    if (originalRequestFullscreen) {
        Element.prototype.requestFullscreen = function() {
            showGuardianAlert("Сайт попытался развернуться на весь экран. Заблокировано.");
            return Promise.reject(new Error("Fullscreen blocked by Shield"));
        };
    }

    // 12. ПЕРЕХВАТ КОНСТРУКТОРОВ Audio
    const OriginalAudio = window.Audio;
    window.Audio = function(...args) {
        const url = args[0];
        if (typeof url === 'string' && (url.includes('qu.ax') || url.includes('.mp3') || url.includes('scary'))) {
            showGuardianAlert("Заблокирована фоновая загрузка звука");
            return new OriginalAudio("");
        }
        const audioInstance = new OriginalAudio(...args);
        const originalPlay = audioInstance.play;
        audioInstance.play = function() {
            if (this.src && (this.src.includes('qu.ax') || this.src.includes('.mp3') || this.src.includes('scary'))) {
                showGuardianAlert("Заблокировано воспроизведение скрытого звука");
                return Promise.reject(new Error("Play blocked"));
            }
            return originalPlay.apply(this, arguments);
        };
        return audioInstance;
    };

    // 13. ПРИНУДИТЕЛЬНЫЕ СТИЛИ (Анти-невидимый курсор и блокировка L4m1n)
    const shieldStyles = document.createElement('style');
    shieldStyles.innerHTML = `
        /* Запрещаем сайту прятать курсор мыши */
        body, html, * { cursor: auto !important; }

        /* Жестко гасим специфичный оверлей с танками/гифками */
        #L4m1n, #scary-image {
            display: none !important;
            opacity: 0 !important;
            background-image: none !important;
            z-index: -1 !important;
            pointer-events: none !important;
        }
    `;
    if (document.documentElement) {
        document.documentElement.appendChild(shieldStyles);
    }

    // ======================================================================
    // НОВЫЕ МОДУЛИ ЗАЩИТЫ v10 (Против жестко вшитых скримеров типа gta-6-download)
    // ======================================================================

    // 14. ГЛОБАЛЬНЫЙ ПЕРЕХВАТ МЕТОДА .play() ДЛЯ ЛЮБЫХ МЕДИА-ЭЛЕМЕНТОВ
    // Это заблокирует звук, даже если тег <audio> уже был прописан в HTML с самого начала
    const originalMediaPlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function() {
        const src = this.src || this.currentSrc || "";
        const id = this.id || "";

        if (src.includes('scary') || src.includes('boo') || src.includes('mp3') || id.includes('background-sound')) {
            showGuardianAlert("Заблокировано воспроизведение вшитого аудио-скримера");
            this.muted = true; // Наглухо мутим звук на случай пробития
            return Promise.reject(new DOMException("Autoplay blocked by Smart Shield", "NotAllowedError"));
        }
        return originalMediaPlay.apply(this, arguments);
    };

    // 15. ЗАЩИТА ОТ МИГАНИЯ ФОНА (setInterval)
    // Отслеживаем изменения атрибута style у тега <body> в реальном времени
    const backgroundObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'style' && document.body) {
                const bgImage = document.body.style.backgroundImage;
                if (bgImage && (bgImage.includes('scary') || bgImage.includes('screamer'))) {
                    document.body.style.backgroundImage = 'none';
                    document.body.style.backgroundColor = '#222'; // Ставим нейтральный фон
                    showGuardianAlert("Заблокировано агрессивное мигание фона");
                }
            }
        });
    });

    // 16. БЛОКИРОВКА СПАМА МОДАЛЬНЫМИ ОКНАМИ (Анти-Локер)
    // Глушим системные алерты, чтобы сайт не мог повесить браузер бесконечным спамом
    window.alert = function(msg) {
        console.warn("[Shield] Заблокирован системный alert: " + msg);
    };
    window.confirm = function(msg) {
        console.warn("[Shield] Заблокирован системный confirm: " + msg);
        return false; // Всегда отказываемся
    };
    window.prompt = function(msg) {
        console.warn("[Shield] Заблокирован системный prompt: " + msg);
        return null; // Всегда отменяем ввод
    };

    // Запускаем обсервер фона, когда body появится в DOM
    const initBgObserver = () => {
        if (document.body) {
            backgroundObserver.observe(document.body, { attributes: true, attributeFilter: ['style'] });
        } else {
            requestAnimationFrame(initBgObserver);
        }
    };
    initBgObserver();

    // 17. МОМЕНТАЛЬНАЯ ГЛУШИЛКА ПРЕДЗАГРУЖЕННЫХ МЕДИА (Fix для новых вкладок)
    const silenceExistingMedia = () => {
        // Ищем все аудио и видео на странице
        const media = document.querySelectorAll('audio, video');
        media.forEach(m => {
            const source = m.src || (m.querySelector('source') && m.querySelector('source').src) || "";
            // Если в ссылке есть подозрительные слова
            if (source.includes('boo') || source.includes('scary') || source.includes('sounds') || source.includes('mp3')) {
                m.muted = true; // Сначала мутим
                m.pause();      // Останавливаем
                m.src = "";     // Удаляем источник
                m.remove();     // Удаляем из DOM
                showGuardianAlert("Вшитый звук скримера обезврежен!");
            }
        });
    };

    // Запускаем проверку каждые 10мс в начале загрузки, чтобы опередить автоплей
    const fastScanner = setInterval(silenceExistingMedia, 10);

    // Останавливаем сканер через 5 секунд (когда страница точно загрузилась)
    setTimeout(() => clearInterval(fastScanner), 5000);

    // Также блокируем изменение стилей (против мигания и вылетов)
    if (document.documentElement) {
        const observer = new MutationObserver(silenceExistingMedia);
        observer.observe(document.documentElement, { childList: true, subtree: true });
    }

})();