# Chrome Web Store submission

Archived on 22 November 2026. Chrome publication and active development have been discontinued. The following draft is retained for anyone who resumes the legacy port.

## Release candidate

Use the Chrome ZIP produced by `python scripts/build_chrome.py` from the tested release commit. The ZIP must contain manifest.json at its root. The Firefox XPI and source ZIP are separate packages.

Chrome uses Manifest V3. Its standalone chat button opens the official Twitch chat in a new tab. The Twitch-page mode keeps the site's existing chat. Firefox retains its embedded standalone chat.

## English description

Watch Twitch live streams with adjustable buffering and instant replay of video already in the buffer.

Choose a player mode with the controls beside W on Twitch. Player on Twitch replaces the video player and keeps the channel page and chat. Standalone Weave opens the video on its own page. Off keeps the Twitch player. Right-click W to change the mode. On a live channel, left-click W to launch the selected mode. In Off mode, left-click does nothing.

The player includes volume controls, fullscreen, playback settings and replay of buffered video. In Chrome, the standalone player's chat button opens official Twitch chat in a new tab.

Weave stores settings and diagnostic reports on your device. It has no analytics service or automatic report upload. Playback connects to Twitch and its media servers. Twitch session information is used for Twitch requests when you are signed in. Twitch handles chat and sign-in.

Weave is an independent fork of Alternate Player for Twitch.tv by CoolCmd. It is not affiliated with Twitch.

## Russian description

Смотрите прямые трансляции Twitch с настройкой буферизации и повтором видео, которое уже находится в буфере.

Выберите режим кнопками рядом с W на Twitch. «Плеер на странице Twitch» заменяет видео и сохраняет страницу канала с чатом. «Отдельная страница Weave» открывает видео на собственной странице. «Выключено» сохраняет плеер Twitch. Правый щелчок по W меняет режим. На странице прямого эфира левый щелчок запускает выбранный режим. В режиме «Выключено» левый щелчок ничего не делает.

В плеере есть управление громкостью, полноэкранный режим, настройки воспроизведения и повтор видео из буфера. В Chrome кнопка чата в отдельном плеере открывает официальный чат Twitch в новой вкладке.

Weave хранит настройки и диагностические отчёты на вашем устройстве. В нём нет сервиса аналитики или автоматической отправки отчётов. Для просмотра плеер подключается к Twitch и его медиасерверам. Если вы вошли в Twitch, сведения сеанса используются в запросах к Twitch. Вход и чат обрабатывает Twitch.

Weave — независимое продолжение Alternate Player for Twitch.tv от CoolCmd. Проект не связан с Twitch.

## Purpose and permissions

Single purpose: play Twitch live streams with configurable buffering and replay, either on the channel page or on a standalone player page.

- storage saves player settings and the selected mode locally.
- cookies reads Twitch session and device cookies to make Twitch API requests in the current browser profile.
- clipboardWrite supports the explicit Copy stream URL and Copy channel URL commands.
- Twitch host access supports channel detection, metadata, playback tokens and optional bonus-point claiming on visible Twitch buttons.
- Media host access loads Twitch playlists and video segments from the CDN domains in the manifest.

The Chrome build removes webRequest and webRequestBlocking. The player scripts, worker and WebAssembly module are bundled in the ZIP. Twitch chat runs as a separate official website in Chrome.

## Data disclosures

Use PRIVACY.md as the description of actual data flows. Do not claim that playback is fully offline or that no information leaves the device. Channel names, device identifiers and playback tokens are sent to Twitch and its media servers. Signed-in Twitch requests can include the Twitch authentication token. Diagnostic exports stay local unless the user chooses to share a file.

Review the dashboard's exact data-category definitions against these flows before saving its declarations. Supply a publicly accessible privacy-policy URL before submission.

## Reviewer steps

Open a currently live Twitch channel. Select Player on Twitch beside W. Confirm playback and that Twitch chat remains available. Collapse and expand chat, change volume and enter fullscreen. After several seconds, use the replay control to view buffered video and return to live playback. Select Standalone Weave and confirm that the chat button opens official Twitch chat in a new tab. No account is needed to test public live playback. Twitch requires an account for chat participation and account-specific functions.

## Publication sequence

1. Upload the tested Chrome ZIP and the current icon and screenshots.
2. Save the listing, privacy declarations, reviewer instructions and distribution settings.
3. Submit for review with publication after approval.
4. Verify public installation before adding the store link to README.
5. If Chrome publishes first, make the GitHub repository public and show Chrome as available and Firefox as awaiting review, after checking both statuses. Keep the independent-fork credit and license.
