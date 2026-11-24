# Brief for a reviewing agent on Culina

You review a change another agent made in /home/user/domus (app `apps/culina`). It is
uncommitted: `git status` and `git diff HEAD` (plus untracked files) are the change. You did
not write it and you are its only reviewer before it is committed and merged. Do NOT edit any
file, do not commit; you only read, run things and report.

Read first: /home/user/domus/AGENTS.md, /home/user/domus/apps/culina/AGENTS.md,
apps/culina/docs/design.md (layout and copy rules), and for the native app
apps/culina/packages/linux/AGENTS.md.

What to look for, in this order:

1. **Wrong behaviour**: read the changed source fully (not only the diff hunks: the functions
   around them and their callers). Think through real inputs: an empty notebook, own dishes
   beside shipped ones, German and English, a filter that leaves nothing, the catalogue not
   yet loaded, a dish without the optional field. Find a concrete input that gives a wrong
   result, a crash, a lost focus, a stale display.
2. **Tests that prove nothing**: for each new test and browser check ask whether it would fail
   if the feature were broken or absent. A check that was changed: was the old expectation
   really the replaced behaviour, or was a check bent around a defect?
3. **The project's rules**: both languages for every text, short neutral copy, phone first
   (360 px, targets 44 px, no horizontal scroll), headings in order, a name on every control,
   docs updated and true (they must not claim what the code does not do), nothing judged about
   a dish, no new dependency, parts stay apart (`npm run boundaries` from the root).
4. **Accessibility and keyboard**: heading levels, labels, focus after a change.
5. Simplicity: dead code, a duplicate of an existing helper.

You may run: `npm run check:culina` from /home/user/domus; single tests with
`npx vitest run <file>` in the package; a look in a browser (build with
`npm run build -w @culina/app` from apps/culina, serve `packages/app/dist` with
`python3 -m http.server 8766 -d packages/app/dist`, drive it with a Playwright script placed in
`packages/app/e2e/` using `executablePath: '/opt/pw-browsers/chromium'`, read screenshots with
the Read tool, delete the script afterwards). Do not run the whole e2e suite.

Report (final message, short): a list of findings, most severe first. For each: file and
line, what is wrong, the concrete input or steps that show it, and whether you CONFIRMED it
(you ran it or traced it fully) or it is PLAUSIBLE. Mark each as "must fix before merge" or
"minor". Do not list praise or style opinions. If you found nothing in a category, say
"nothing found" for it in one line. End with one line: what you did not look at.
