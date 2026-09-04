# Youlin

[中文](README.md) · [English](README.en.md)

A collecting and social site for younger stamp collectors: a digital album, show-and-tell posts, and matching wants against duplicates.

Youlin is for neighbourly swaps only. **It does not trade, quote prices, or value stamps.** It is a working local prototype that can also be deployed publicly. Help make it feel like a small site people actually use.

The interface switches between **Chinese and English** from the top bar. If the browser language is not Chinese, English is the default. The choice is stored on the device.

Repository: [github.com/codinghhr1103/youlin](https://github.com/codinghhr1103/youlin)

## Contents

- [What this is](#what-this-is)
- [What it does now](#what-it-does-now)
- [Stack](#stack)
- [Layout](#layout)
- [Run locally](#run-locally)
- [Demo accounts](#demo-accounts)
- [Stamp images](#stamp-images)
- [Deploy on Render](#deploy-on-render)
- [How to contribute](#how-to-contribute)
- [Good first directions](#good-first-directions)
- [Known limits](#known-limits)
- [Licence](#licence)

## What this is

Many collectors hold duplicates and still miss stamps they want, but have no light, friendly place to meet. Youlin keeps that small and clear:

1. Put stamps in a digital album (owned / wanted / for swap)
2. Show a copy so others can see condition and story
3. Match “your swap × their want”, then both sides propose, accept, and complete

It is for people who will share a collection and swap duplicates for wants — not for an auction house or a price list.

## What it does now

- **Register / sign in**: username plus email or mobile; sign-in accepts username, email or mobile. The site **does not send** SMS or email codes. Email and mobile are visible only to you and administrators.
- **Stamp catalogues**: links to StampDIR, PostalWiki, WNS, Colnect and others. No world catalogue of our own.
- **Primer**: gum, perforation, sheets and panes, older Ji/Te numbering, year-serial issues, and similar terms.
- **Digital album**: mark a stamp owned, wanted or for swap, with mint/used and condition notes.
- **Show & tell**: readable without signing in; signed-in users can post and like. A post can link to a sample stamp on the site.
- **Swap matching**: find counterparts from wants and duplicates; propose / accept / complete.
- **Collector pages**: see a bio and album; you can edit display name, city and bio.
- **Admin**: administrators can view users (including contact details) and disable or restore accounts.

Pages include home, catalogues, primer, show & tell, album, swaps, stamp detail, profile settings, collector pages, and user admin for administrators.

## Stack

Kept simple on purpose, so the site can be developed on a machine without Node:

| Layer | Choice |
| --- | --- |
| Backend | Python 3.12, FastAPI, SQLAlchemy, SQLite |
| Front end | Plain HTML / CSS / JS (single page, no build step) |
| Auth | JWT (`pyjwt`) |
| Process | One Uvicorn process serves the API and the static pages |

Dependencies are in `requirements.txt`. The Python version is in `.python-version` (`3.12.8`).

## Layout

```
youlin/
├── app/                  # FastAPI backend
│   ├── main.py           # startup, static pages, routers
│   ├── models.py         # users, stamps, album, posts, swaps
│   ├── routers/          # /api routes
│   ├── seed.py           # catalogue, demo accounts, admin seed
│   └── settings.py       # admin environment variables
├── web/                  # front end
│   ├── index.html
│   ├── css/style.css
│   ├── js/app.js         # rendering and routing
│   ├── js/i18n.js        # Chinese / English UI strings
│   ├── js/guide.js       # primer (both languages)
│   └── stamps/           # public-domain stamp images and manifest
├── scripts/              # re-fetch images from Wikimedia Commons
├── render.yaml           # Render Blueprint
├── LICENSE               # MIT
└── run.ps1               # one-command start on Windows
```

The API prefix is `/api`. On startup the tables are created and seed data is written. The default database is `data/youlin.db`.

## Run locally

You need **Python 3.12**.

### Windows

In PowerShell at the repository root:

```powershell
.\run.ps1
```

The script creates `.venv`, installs dependencies from the Tsinghua mirror, then starts a reload server at http://127.0.0.1:8000.

### macOS / Linux

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Open http://127.0.0.1:8000. API docs are at http://127.0.0.1:8000/docs.

The administrator account is set with `ADMIN_USERNAME`, `ADMIN_PASSWORD` and `ADMIN_EMAIL`. **Do not put a real password in the repository or commit it to Git.** If `ADMIN_PASSWORD` is unset locally, the development default is `youlin-local-admin`, for this machine only.

Registration needs an email address or mobile number as contact, and a tick on the terms.

## Demo accounts

Password for all of these is `youlin123`:

| Username | Display name | City |
| --- | --- | --- |
| `fangcun` | 林方寸 | Hangzhou |
| `achuo` | 阿戳 | Qingdao |
| `xiaofeng` | 小封 | Chengdu |
| `miaopiao` | 喵票 | Shanghai |

Seed data is only there so a new local or empty database can show matching and posts. These are not real users.

## Stamp images

Catalogue images are scans of **Chinese stamps issued before 1931**, from [Wikimedia Commons](https://commons.wikimedia.org/), in the public domain or under CC0 / CC BY-SA. Sources are in `web/stamps/manifest.json` and on each stamp’s detail page.

Original images of modern PRC New Year and special issues are still in copyright, so they are not in the repository. Factual numbers and names can be added later; **the designs themselves must not be copied in**.

To download the images again:

```powershell
python scripts/fetch_stamp_images.py
```

More detail is in [`web/stamps/README.md`](web/stamps/README.md).

## Deploy on Render

The repository includes `render.yaml`. After the code is on GitHub:

1. Open the [Render Dashboard](https://dashboard.render.com) and sign in with GitHub.
2. **New → Blueprint**, and select this repository.
3. Create the `youlin` service (free tier, Singapore region, auto-generated `SECRET_KEY`).
4. In the Render console, set your own `ADMIN_USERNAME`, `ADMIN_EMAIL` and `ADMIN_PASSWORD` (the Blueprint does not write a password into the repository). **If an old sample password from the repo was ever used, change it at once.**
5. When the build finishes, open the URL Render gives you (it may have a suffix if the name is taken).

You can skip the Blueprint: **New → Web Service**, connect this repository, then set:

- Runtime: Python
- Build Command: `pip install -r requirements.txt`
- Start Command: `python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Environment: `PYTHON_VERSION=3.12.8`, a random `SECRET_KEY`, and the admin variables

The free tier sleeps after idle time; the first open may take tens of seconds. SQLite on a free instance is lost on restart; the next start writes seed data again.

## How to contribute

Welcome. A typo, a public-domain scan, a small interaction change, or a product discussion all help.

### Before you start

1. [Watch / Star](https://github.com/codinghhr1103/youlin) the repository and browse [Issues](https://github.com/codinghhr1103/youlin/issues).
2. For a larger change, open an Issue first with motive and a rough plan, so two people do not do the same work.
3. Run the site locally as above, and walk album, show & tell and swaps with a demo account.

### Development

1. Fork this repository, then clone your fork.
2. Branch from `main` with a name that says what you intend, e.g. `fix/login-error`, `feat/stamp-search`.
3. Change it locally and click through the pages you touched. For front-end work, check that the layout still holds at ordinary widths.
4. Do not commit `.venv/`, `data/`, `.env`, database files or real secrets.
5. Push to your fork and open a Pull Request against `main` here.

In the PR, please say:

- what changed and why
- how you checked it (e.g. signed in as `fangcun`, marked a stamp for swap in the album, then opened the swap page)
- a screenshot or recording, especially for UI changes

### Conventions

- Follow the existing style: small FastAPI routes and Pydantic schemas on the back; native rendering in `web/js/app.js` on the front. No React, Vue or bundler for now.
- User-facing copy lives in `web/js/i18n.js`, Chinese and English together. Add both languages when you add a sentence.
- New APIs should consider signed-out, signed-in and disabled accounts.
- Do not add copyrighted modern stamp images in the name of a “complete catalogue”. What can be added are pre-1931 scans with a checked licence, credited in `manifest.json`.

Commit messages may be Chinese or English. One clear sentence is enough, e.g. “Fix swap matching when the album is empty”.

## Good first directions

No required order. Any of these suits a first contribution:

- Accessibility and mobile layout: navigation and forms on a small screen
- Clearer empty and error copy
- Tests for the important APIs (the repository has almost none yet)
- Docs: make a step harder to get wrong
- Discussion of the next stage: a lasting database, user-created holdings, a fuller swap flow (please open an Issue first)

If you are unsure where to start, open an Issue and say hello — front end, back end, or philatelic notes.

## Known limits

- This is a prototype, not a production service: SQLite, one process, free hosting that sleeps.
- No email or SMS. Registration checks format only, not that the contact is really yours.
- No front-end build. All page logic sits in `web/js/app.js`, which will grow with features.
- Swaps are an on-site state machine. There is no shipping, expertising or dispute handling.
- Administrators can currently only list users and disable or restore them.

These limits are also places to improve together. They need not be finished in one pass.

## Licence

Copyright and sources for stamp images are in [Stamp images](#stamp-images) and `web/stamps/manifest.json`.

The code is released under the [MIT License](LICENSE). By submitting code you agree that the maintainer may include the contribution under the same licence.
