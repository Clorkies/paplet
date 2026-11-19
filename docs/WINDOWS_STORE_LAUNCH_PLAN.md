# Stickee Windows Store launch plan

Prepared Thursday, November 19, 2026. All dates use Manila time (UTC+8). Target submission on Monday, November 23. Aim for public availability on Friday, November 27, during the November 23–29 launch week. Treat submission as the milestone the team controls. Microsoft says manual account verification typically takes 2–5 business days and certification can take up to three business days. Those clocks can run consecutively, and a rejection adds another cycle. [Account verification](https://learn.microsoft.com/en-us/windows/apps/publish/prepare-developer-account) · [MSIX certification](https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/msix/app-certification-process)

## Release scope and starting point

Ship a free, local-first Windows x64 desktop app through the Microsoft Store packaged-app channel. Microsoft hosts, signs and delivers updates for the Store package. Use a small public site for privacy, support and the Store link. Proposed first listing language is English. Select supported Windows versions and markets after testing and publisher review. [Distribution options](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/choose-distribution-path)

The working branch has native notes, the manager, sets, Trash, preferences, 62 previously passing tests and a tested unpacked executable. The user accepted Alt+Tab behavior on November 19. SFX selection belongs to the publisher. The current package still uses prototype identity and the default Electron icon. The unsigned ZIP remains the regression baseline. The deliverable for submission is a Store-identified AppX package from electron-builder. Track existing evidence separately from tests on the installed Store candidate. [Native acceptance record](MANUAL_TEST_MATRIX.md)

## Your checklist as publisher

### Do today, Thursday, November 19

- [ ] **Choose who owns the listing.** For a personal release in your own name, use Individual. Use Company if a registered business is the publisher. Use a Microsoft account you expect to control after graduation. If already enrolled in the Windows developer program, use that account. Choose your actual country/region, Philippines if applicable, and review the public publisher/contact details. [Account setup](https://learn.microsoft.com/en-us/windows/apps/publish/partner-center/open-a-developer-account)
- [ ] **Complete enrollment yourself.** Start at the Store developer portal, choose the free onboarding flow, sign in, set up MFA and recovery access, and accept the agreement. For an individual, have your phone, original government-issued photo ID and matching contact details ready for the ID and selfie check. Watch the verification email and Partner Center status. Keep ID images, passwords and recovery codes private. [Start enrollment](https://storedeveloper.microsoft.com/) · [Individual onboarding](https://learn.microsoft.com/en-us/windows/apps/publish/whats-new-individual-developer)
- [ ] **Reserve the product name.** In Partner Center → Apps and games, create a packaged Windows app and reserve Stickee if available. Prepare one fallback name you have rights to use. Send engineering the reserved display name and these exact values from **Product identity**. Copy capitalization and the entire publisher string. [Manifest checklist](https://learn.microsoft.com/en-us/windows/apps/publish/store-readiness-checklist)

| Handoff field | Where it goes |
|---|---|
| Reserved app display name | Manifest, listing, screenshots and help |
| Package/Identity/Name | AppX identity name |
| Package/Identity/Publisher | Manifest publisher, including the CN value |
| Package/Properties/PublisherDisplayName | Human-readable manifest publisher |
| Store product ID, when available | Public Store link and release verification |
| Public support email and preferred site address | Support page, privacy contact and listing |

### Approve before the candidate freezes

- [ ] Supply or approve an original icon and any final sound assets, including distribution rights. Choose the shipping sound/default or approve a muted default if SFX is still undecided. Approve the project license and third-party notices.
- [ ] Choose the public support mailbox you will monitor. Approve privacy and support text, app description, category (suggested Productivity), markets, price (Free), screenshots and minimum supported Windows version. Review any trader/contact declarations Partner Center requests for your chosen markets. Complete the age-rating questionnaire using the shipping app's actual behavior. [Submission fields](https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/msix/create-app-submission)
- [ ] Provide a clean Windows user account or VM for install/upgrade tests and access to a real Windows machine for tray, display and sleep/wake tests. Supply synthetic screenshot content. Keep your real notes and private information out of test artifacts.
- [ ] Review the release diff, authorize integration through dev, then approve the exact candidate version and artifact for submission. Select manual publishing hold if you want the final launch click. Monitor the dashboard and keep time available for certification questions and a first-day fix. [Certification and publishing](https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/msix/app-certification-process)

**Accounts and budget.** Required for distribution are your Microsoft account and verified Store developer enrollment. For the site, use an existing host you control or a free static host such as Cloudflare Pages with its provided subdomain. A separate host account is needed only if you choose one you do not already have. Existing repository access covers source and CI, subject to your runner allowance. Budget ₱0 in mandatory platform fees for the proposed free individual Store route. A paid domain, student pack, Azure subscription, commercial signing certificate, Apple membership and backend account are outside this launch's requirements. A development certificate may be used for local test installation. Keep its private key out of Git. [Store onboarding](https://learn.microsoft.com/en-us/windows/apps/publish/whats-new-individual-developer) · [Store signing](https://learn.microsoft.com/en-us/windows/apps/publish/store-readiness-checklist)

## Implementation calendar

| Manila date | Engineering deliverable | Publisher action and exit condition |
|---|---|---|
| Thu Nov 19 | Inventory the uncommitted release baseline and compare dev and feature history. Begin backup/restore using synthetic collections. Draft site and listing copy. | Start verification and reserve the name as soon as access opens. Return the identity handoff above. |
| Fri Nov 20 | Finish validated backup/restore and migration tests. In parallel, prepare the Windows CI build and AppX target. | Choose branding, SFX disposition, support address, license and scope. Confirm that the verified account can create a submission. |
| Sat–Sun Nov 21–22 | Build RC1 with assigned identity. Run clean install, upgrade, data recovery, native QA and Windows App Certification Kit (WACK). Record failures and retest the rebuilt artifact. Prepare screenshots from that candidate. | Test the installed candidate, approve copy/assets and publish the support/privacy URLs. Review the go/no-go evidence. |
| Mon Nov 23 | Freeze the tested source revision, record the candidate package SHA-256 and version, and prepare reviewer instructions. | Upload the exact approved AppX, complete the Store submission, choose the publishing hold and submit if all gates pass. |
| Tue–Thu Nov 24–26 | Triage validation and certification findings. For a binary fix, increment the package version, rebuild, rerun affected gates and record the replacement hash. | Check Partner Center and email daily. Respond to identity or policy questions yourself. Approve resubmission when needed. |
| Fri Nov 27 | After publication, install from the actual Store listing on a clean account. Verify first note, tray, relaunch, storage and support links. | Release the publishing hold when ready. Announce only once an external user can install the live listing. |
| Nov 28–29 or next available business day | Monitor install failures, startup, data migration and note visibility. Triage support and prepare a higher-version corrective update if needed. | If verification, certification or a data-safety gate slips, move public launch to the next available date. Use the time for private testing and retain the same Store channel. |

## Engineering work packages

1. **Backup, restore and migration.** Extend the main-owned store and narrowly scoped manager IPC with user-selected export/import. Include note IDs, text, schema 5 vector ink, color, placement, visibility, Trash, memberships and settings. Validate the entire file first, reject unsupported future schemas, preserve the destination before a confirmed replacement, and commit atomically. Test corruption, cancelled selection, disk failure, repeated import and restart. Before changing product identity, locate legacy data using actual prototype paths. Copy and validate it on first eligible launch. Preserve the original and any populated destination. Rehearse interrupted migration, retry and recovery from a separate backup on disposable profiles.
2. **Reproducible Store package.** Add a separate Windows x64 AppX build target in package.json or channel-specific electron-builder configuration. Keep the unpacked QA command. Apply assigned identity and original logos, use a monotonically increasing four-part Store-compatible version, declare the tested OS floor and inspect the generated manifest. Explain the desktop full-trust capability when requested for Electron's native note windows, tray and shortcut. Use Store-managed updates and confirm no independent updater runs. [Microsoft readiness checklist](https://learn.microsoft.com/en-us/windows/apps/publish/store-readiness-checklist)
3. **Build provenance and security.** Use a clean Windows runner with the lockfile, npm ci, typecheck, tests, production build and AppX packaging. Archive logs, hash, manifest and test results against the source revision. Review Electron/dependency advisories, license inventory, preload/IPC boundaries, sandboxing, navigation and permission denial. Verify diagnostic controls and local tracing are off on a normal launch. Keep CI artifact creation separate from permission to publish.
4. **Installed-candidate acceptance.** Use Windows SDK packaging tools and WACK. Exercise a clean standard-user install and a lower-version to higher-version update with matching identity. Cover prototype migration, uninstall/reinstall plus explicit restore, Unicode/IME editing, keyboard operation, reduced motion, mixed DPI, sleep/wake, shortcut conflicts, tray quit/relaunch and overlapping notes. Repeat the 20-note drag smoke on the candidate. Record machine, Windows build, package identity/version, outcome and artifact hash. Reopen Alt+Tab only on a fresh failure.
5. **Listing, website and support.** Prepare branded package assets, Store logo, accurate description, screenshots of the candidate and a support inbox. Publish privacy and support pages over HTTPS. Explain local note storage, backup/restore, Trash, tray Quit, optional local traces and what happens on uninstall. Describe any website hosting logs or voluntarily submitted support data separately from app behavior. Use at least one screenshot; aim for four covering notes, manager, sets and recovery. Reviewer notes should show how to create, drag, hide, restore and quit a note session without credentials. [Submission checklist](https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/msix/create-app-submission)

## Decision gates and post-launch roadmap

**Submit when** the publisher identity matches the manifest, a clean build can be reproduced, the installed upgrade and recovery tests preserve the collection, WACK findings have been resolved or assessed, support/privacy URLs are live, the listing matches the binary, and the publisher approves the recorded artifact. Data loss, an unlaunchable package, identity mismatch or an unresolved security issue that exposes user data blocks submission.

**If a live release fails**, record version and reproduction details, pause announcements, assess availability in Partner Center, preserve user data, then ship a tested higher-version fix. Support should request diagnostic details first and use synthetic notes for reproduction. Keep a recovery copy before any repair.

| Horizon | Work |
|---|---|
| First 48 hours | Verify Store installs in selected markets, monitor support and Store quality reports, prioritize startup/data-loss issues. |
| First 1–2 weeks | Ship necessary fixes through the Store. Document real restore cases and check update adoption, regressions and performance. |
| After Windows stabilizes | Resume structured formatting, then drawing. Keep alternate paper sizes optional and last. Consider NSIS/WinGet only if independent installation demand justifies its signing and updater costs. |
| Later platform decisions | Validate native behavior on real Mac hardware before committing to macOS. Scope iOS as a separate companion. Revisit accounts or synchronization only with demonstrated demand and a separate privacy, offline and operating-cost plan. |
