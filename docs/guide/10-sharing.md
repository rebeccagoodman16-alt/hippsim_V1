---
title: Sharing, hosting and accounts
---
Today hippsim runs as a private page on claude.ai, shared with chosen people; opening it to everyone takes a public host and, for personal accounts, a Firebase project.

| Who | How | Status |
| --- | --- | --- |
| The lab | claude.ai page, Share menu; any browser, nothing to install | Live |
| Anyone (public website) | The built app (`app/`) on GitHub Pages: installs on phones, works offline | Needs the GitHub repository |
| Personal accounts | Google sign-in through Firebase; each person's runs are their own (`docs/ACCOUNTS.md`) | Needs a Firebase project |
| A lab server | Copy `app/` to any HTTPS host | Ready |

**Your data.** Saved runs are stored with your account; only you can change or delete yours. Display settings stay on your device.

## Keeping the installed app up to date
The installed app (from the GitHub Pages address) checks for a new version every time it opens or comes back to the front. A new version downloads in the background and a banner says **hippsim has been updated · Reload**; nothing reloads by itself, so a running simulation is never lost. **Display → Check for updates** checks on demand and shows the version you have. The claude.ai page is always the latest published version.

If an old copy ever seems stuck (for example after a long time offline): close every hippsim window and open it again; as a last resort remove the app and install it again from the website.
