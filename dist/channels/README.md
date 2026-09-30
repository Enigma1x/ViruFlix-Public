# Authorized channel playlist

`authorized.m3u` is an optional local playlist. It is included in the public build only for channels that the deployer owns or is authorized to redistribute. The backend approval gate still protects Live TV in deployed mode.

Before adding a channel, confirm permission for the URL and territory. Do not put keys, tokens, cookies, or credentials in this file. Prefer stable HTTPS streams.

Each entry contains an `#EXTINF` line followed by the stream URL:

```m3u
#EXTINF:-1 tvg-id="my-channel" tvg-name="My Channel" tvg-logo="/channels/logos/my-channel.png" group-title="Education",My Channel
https://media.example/live/playlist.m3u8
```
