# PRD — Project Requirements Document

## Document Control

| Field | Value |
|---|---|
| Project | Ocassio.Project |
| Plan ID | 391a53f1-06e7-40cd-b88c-fb7708c6d61f |
| PRD Version | 3.0 — semantic document version (see Change Log) |
| Source of Truth | `architecture-hierarchy-of-ocassio-project-final.md` (§0–§42) |
| Language | English |
| Revision Status | ✅ Complete — Stages 1–5 applied; every section traceable to the source spec |

> **Note on version numbering.** `PRD Version` above is the *semantic* version of this document (v1 → v2 → v3, tracked in the Change Log). The workspace additionally keeps an internal *save counter* at `pipeline.json → prdVersion`, which increments on every saved revision; the two numbers are intentionally different and must not be treated as the same version.

### Change Log

This revision realigns the PRD with the final architecture document. The previous v1 was a slimmer, partially divergent scope. Corrections applied:

- **Taxonomy aligned.** v1 used Wedding / Portrait / Event / Product / Editorial. v2 uses the architecture taxonomy: Work filters `All / Photography / Film / Commercial / Editorial / Portrait / Product / Event`, and 7 service types defined in §6.4.
- **Public pages expanded.** v1 covered Home, Project Gallery, Info Pages and an Enquiry flow. v2 defines the full 14-page public sitemap (Work, Services + Service Detail, Pricing, Process, About, Journal + Article Detail, Now, Contact, Start a Project, Privacy, Terms).
- **Availability Check removed.** Directly conflicts with §41 (Booking / Availability excluded).
- **Newsletter Signup removed.** No newsletter or subscription exists anywhere in the architecture spec.
- **Contact routing corrected.** v1 allowed project enquiries from a single contact form. §6.12 forbids this: project requests route to `Start a Project`; only general questions use `Contact`.
- **Roles expanded.** v1 used `owner | admin`. v2 uses the four roles in §27: Owner, Editor, Media Manager, Sales.
- **Admin CMS expanded.** v1 covered 4 modules. v2 defines the full CMS tree in §8 (Dashboard, Website, Portfolio, Services, Journal, Studio, Current, Media, Business, Publishing, SEO, Users & Roles, Activity Log, Settings).
- **Design system added.** v2 encodes the locked Ocassio palette, typography, spacing, radius, theme map and motion rules from §31.
- **Guiding rule preserved.** ONE CONTENT TYPE = ONE ADMIN OWNER = ONE SOURCE OF TRUTH.

### Change Log — v2 → v3

This revision completes the remaining stages and removes all internal ambiguity:

- **Stage 2 completed.** Full page hierarchy for Pricing (3 pricing types), Process (9 steps), About, Journal + Article Detail, Now, Contact, Start a Project (4 sections), Privacy & Terms; plus the three public user flows and the `NO DEAD-END PAGE` rule.
- **Stage 3 completed.** Full Admin CMS architecture, the four roles (Owner, Editor, Media Manager, Sales), inquiry pipeline, publishing workflow, version history, delete flow, activity log, CRUD UX language, and the Public Content Ownership Matrix.
- **Stage 4 completed.** System Architecture (public vs admin surfaces, data flow, architecture rules, system loop, boundary), the derived Database Schema (enumerations + entities), and the Tech Stack constraints. Explicit note added: "InsForge" does not appear anywhere in the source spec and is not part of this PRD; the stack remains an open decision per `pipeline.json` (`ai-pilih`).
- **Stage 5 completed (§28–§32).** Design System (locked palette, typography, spacing, grid, shape, elevation, buttons, navigation, theme map, page theme defaults, card/detail/service/journal/pricing components, form + Start a Project UX, video, cursor, motion, breakpoints, accessibility, and the full Admin design system), plus Validation & Error Prevention, Admin CRUD Flow, Exclusions (§41, 11 items), and Final Direction (§42).
- **Schema errors corrected (E2–E6).** `recognition_type` → `publication / award / feature / exhibition`; `upcoming_status` reduced to `in_production / coming_soon` with `private` kept only on the separate Visibility field; `inquiries` field mapping realigned to §6.13 (Service, Project Type, Project Description / Desired Date, Location, Budget Range, Expected Deliverables); `project_block_type` realigned to §6.3 (removed `editorial_grid`, restored `spacer`); media variants realigned to §21 (`thumbnail / mobile / tablet / desktop / webp / avif`).
- **Document Control corrected.** Header and tracker now reflect the true state; the semantic document version is disambiguated from the workspace save counter.

### Revision Progress Tracker

| Stage | Scope | Status |
|---|---|---|
| 1 | Doc Control, Overview, Requirements, Sitemap, Navigation, Page Hierarchy (Home → Service Detail) | ✅ Done |
| 2 | Page Hierarchy (Pricing → Privacy/Terms), Public User Flows | ✅ Done |
| 3 | Admin CMS Architecture, Roles, Content Ownership Matrix | ✅ Done |
| 4 | Architecture, Database Schema, Tech Stack | ✅ Done |
| 5 | Design System (§31 full), Validation, Admin CRUD Flow, Exclusions, Final Direction | ✅ Done |

---

## 1. Overview

**Ocassio.Project** is a digital creative studio platform for professional photography and film. It is not merely an online gallery — it functions as a portfolio, a visual storytelling platform, a creative studio profile, a service showcase, a pricing reference, a project inquiry system, a journal, a project-update surface, and a content management system.

The platform has two primary surfaces:

```text
PUBLIC WEBSITE
→ for audiences, prospective clients, and showcasing creative work

ADMIN CMS
→ for owners and editors to manage all website content without touching the codebase
```

**Primary objective**

```text
SEE
↓
FEEL
↓
TRUST
↓
UNDERSTAND
↓
START A PROJECT
```

Today the studio's work is fragmented across Instagram, WhatsApp, Drive files and separate price documents. Enquiries arrive in several channels, pricing is unclear, and the portfolio undersells the quality of the work. Ocassio.Project replaces this with **one home**: a cinematic, image-first experience for the work, editorial light pages for information and business clarity, a structured project inquiry pipeline, and a private Admin CMS where everything is managed without code.

**Guiding rule:** ONE CONTENT TYPE = ONE ADMIN OWNER = ONE SOURCE OF TRUTH. Every piece of content is edited in exactly one place and published from there. The same data is never independently editable from two different modules.

**Main goals**
- Present the work in a premium, immersive, image-first way.
- Explain services, pricing and process clearly on one trusted site.
- Convert interest into a structured project brief through `Start a Project`.
- Run the whole site from a clear, role-aware Admin CMS with no routine code changes.
- Guarantee that nothing draft, private or outdated ever shows publicly.

---

## 2. Requirements

### Functional

- All 14 public pages work: Home, Work, Project Detail, Services, Service Detail, Pricing, Process, About, Journal, Article Detail, Now, Contact, Start a Project, Privacy, Terms.
- A full authenticated Admin CMS exists with sign-in, role-based access, media library, content editors and publishing controls.
- Full CRUD for every content type defined in the specification, with reorder, hide/show, preview, schedule, publish, unpublish and archive.
- Content lifecycle supports: draft, validation, preview, publish, unpublish, scheduled publishing, archive, delete protection and version history.
- Visitors can browse the portfolio, read journal articles, view current/coming-soon activity, and submit a project brief through `Start a Project` (§6.13).
- Navigation, footer links, contact details, social links and legal content are managed as content, never hardcoded.
- Every page provides a logical next action — the architecture enforces `NO DEAD-END PAGE` (§7).

### Quality & Non-Functional

- **Design:** only the locked Ocassio palette (§31.1). Portfolio/photo/video pages are dark, cinematic and image-first. Information pages are light, editorial and premium. Admin is light-first, compact and functional.
- **Typography, spacing, grid, CTA, form, motion and accessibility** rules follow §31 exactly.
- **Responsive** on mobile, tablet, desktop and wide desktop (§31.26–§31.28), with layouts that adapt rather than shrink.
- **Media:** administrators upload the source once; the system generates optimized variants. RAW/TIFF originals are never served publicly (§21, §36).
- **States:** loading, empty, success, error, disabled, validation and permission states are all handled (§31.35, §31.37).
- **Security:** authentication, authorization, content ownership and draft/private content are enforced server-side — hiding buttons in the frontend is not sufficient authorization (§27).
- **Scope discipline (§0, §40):** no new page, module, content type, business rule, colour or database relationship beyond what the specification documents. Administrators cannot modify fonts, colors, grids, component code, custom CSS, auth logic, schema or API logic (§3.2).

---

## 3. Public Website Sitemap

```text
/
│
├── Home
│
├── Work
│   ├── All Work
│   ├── Photography
│   ├── Film
│   └── Project Detail
│
├── Services
│   └── Service Detail
│
├── Pricing
│
├── Process
│
├── About
│
├── Journal
│   └── Article Detail
│
├── Now
│
├── Contact
│
├── Start a Project
│
├── Privacy
│
└── Terms
```

---

## 4. Main Navigation

```text
OCASSIO.PROJECT

Work
Services
Process
About
Journal
Contact

[ Start a Project ]
```

- `Pricing` does not appear in the primary navigation.
- `Now` / Coming Soon does not appear in the primary navigation.
- Both remain reachable through contextual links, the homepage, service pages and the footer.

---

## 5. Public Page Hierarchy

### 5.1 Home — `/`

**Goal:** create a strong first impression and guide visitors toward `WORK` or `START A PROJECT`.

**Structure**

```text
NAVBAR
↓
01 HERO
↓
02 SELECTED WORK
↓
03 OCASSIO INTRODUCTION
↓
04 FEATURED PROJECT
↓
05 SERVICES
↓
06 SHOWREEL
↓
07 HOW WE WORK
↓
08 CLIENTS / RECOGNITION
↓
09 CURRENTLY / COMING SOON
↓
10 JOURNAL
↓
11 START A PROJECT
↓
FOOTER
```

**Content**
- **Hero:** background image/video, headline, short statement, `View Work`, `Start a Project`.
- **Selected Work:** 4–6 selected projects.
- **Introduction:** short brand statement.
- **Featured Project:** one project with strong visual emphasis.
- **Services:** preview of the primary services.
- **Showreel:** one selected film/video.
- **Process:** concise preview of the Ocassio workflow.
- **Clients / Recognition:** selected clients, publications, awards or features.
- **Currently:** current project or coming soon.
- **Journal:** up to 3 latest or featured articles.
- **Final CTA:** "Have a project in mind? Start a Project →".

**Admin owner:** `Admin → Website → Homepage`. Administrators can edit copy, replace hero media, select featured projects/article/showreel, reorder supported sections, show/hide optional sections, preview and publish.

**Theme:** Hero / Selected Work / Featured Project / Showreel / Currently are DARK; Introduction / Services / How We Work / Clients / Journal / Start a Project / Footer are LIGHT (see §31.14).

---

### 5.2 Work — `/work`

**Goal:** the master portfolio for all published Ocassio work.

**Filters**

```text
All
Photography
Film
Commercial
Editorial
Portrait
Product
Event
```

Filters must not create separate pages.

**Project Card:** cover, project name, client/type, year.

**Admin owner:** `Admin → Portfolio → Projects`. The Work page is generated automatically from projects where `Status = Published` and `Visibility = Public`.

**Theme:** Dark.

---

### 5.3 Project Detail — `/work/[slug]`

**Goal:** present each project as a visual case study.

**Structure**

```text
PROJECT HERO
↓
PROJECT INFORMATION
↓
INTRODUCTION
↓
PROJECT CONTENT
↓
FILM (optional)
↓
BEHIND THE SCENES (optional)
↓
CREDITS
↓
RELATED PROJECTS
↓
NEXT PROJECT
```

**Header fields:** project name, client, year, location, category, services.

**Allowed content blocks:** Text, Full Width Image, Landscape Image, Portrait Image, Image Pair, Gallery, Quote, Video, Behind The Scenes, Spacer. Administrators can add, edit, remove and reorder blocks — but cannot create arbitrary custom components.

**Credits:** photography, director, DOP, stylist, makeup, production, agency, client. Empty fields must not be rendered.

**Admin owner:** `Admin → Portfolio → Projects`.

**Theme:** Dark.

---

### 5.4 Services — `/services`

**Goal:** explain the services offered by Ocassio.Project.

**Initial service types**

```text
Photography
Film & Motion
Commercial Campaign
Portrait
Product
Event
Creative Production
```

**Note (non-ambiguity):** service types here (7 items) and Work filters (§5.2, 8 items) are **separate taxonomies — do not merge them into one model.** §5.2 additionally includes `Editorial` and omits `Creative Production`.

Each service contains: cover, name, short description, starting price (optional), related projects.

**Admin owner:** `Admin → Services → Services`.

**Theme:** Light.

---

### 5.5 Service Detail — `/services/[slug]`

**Structure**

```text
SERVICE HERO
↓
DESCRIPTION
↓
WHO THIS IS FOR
↓
WHAT WE DELIVER
↓
SELECTED WORK
↓
PROCESS
↓
PRICING PREVIEW
↓
FAQ
↓
START A PROJECT
```

**Admin fields:** name, slug, hero, short description, description, who it is for, deliverables, related projects, related pricing, related FAQ, CTA, SEO, status.

**Admin owner:** `Admin → Services → Services`.

**Theme:** Light.

---

### 5.6 Pricing — `/pricing`

**Goal:** set professional budget expectations without presenting the studio like a SaaS subscription product.

**Pricing types**

```text
FIXED
STARTING FROM
CUSTOM QUOTE
```

**Example — portrait session:** title, type (`Starting From`), amount (`Rp X.XXX.XXX`), duration (`90 Minutes`), includes (`15 Final Photographs`, `Professional Retouching`, `High Resolution Delivery`).

**Example — commercial project:** type (`Custom Quote`); pricing depends on `Scope`, `Crew`, `Location`, `Usage Rights`, `Production`, `Duration`, `Deliverables`.

**Admin owner:** `Admin → Services → Pricing`.

**Theme:** per §31.15 and §31.20 (pricing presentation).

---

### 5.7 Process — `/process`

**Goal:** explain clearly how clients work with Ocassio.Project.

**Default flow**

```text
01 Inquiry
02 Discovery
03 Creative Direction
04 Proposal
05 Pre-production
06 Production
07 Post-production
08 Review
09 Delivery
```

Each process step contains only: number, title, short explanation.

**Admin owner:** `Admin → Services → Process`.

**Theme:** per §31.15.

---

### 5.8 About — `/about`

**Goal:** introduce the studio identity and the people behind Ocassio.Project.

**Structure**

```text
HERO / PORTRAIT
↓
ABOUT OCASSIO
↓
PHILOSOPHY
↓
FOUNDER
↓
TEAM / COLLABORATORS
↓
SELECTED CLIENTS
↓
RECOGNITION / PUBLICATION
↓
START A PROJECT
```

**Admin ownership**

```text
About       → Studio > About
Team        → Studio > Team
Clients     → Studio > Clients
Recognition → Studio > Recognition
```

**Theme:** per §31.15.

---

### 5.9 Journal — `/journal`

**Goal:** show creative thinking, behind-the-scenes content, studio activity and the stories behind the work.

**Categories**

```text
All
Project Stories
Behind The Scenes
Photography
Film
Studio Notes
```

**Article card:** cover, category, title, publish date, reading time.

**Admin owner:** `Admin → Journal → Articles`.

**Theme:** per §31.15 and §31.19 (journal card).

---

### 5.10 Article Detail — `/journal/[slug]`

**Structure**

```text
TITLE
↓
CATEGORY + DATE
↓
COVER
↓
ARTICLE
↓
RELATED PROJECT (optional)
↓
RELATED ARTICLES
↓
START A PROJECT
```

**Allowed blocks:** Paragraph, Heading, Image, Gallery, Video, Quote, Project Reference.

**Admin owner:** `Admin → Journal → Articles`.

**Theme:** per §31.15.

---

### 5.11 Now — `/now`

**Goal:** show selected studio activity that is currently in progress.

**Public status:** `In Production`, `Coming Soon`.

**Card fields:** project name, project type, location, public status, expected release, teaser.

**Visibility:** `Public` / `Private`. Confidential projects must be `Private`.

**Admin owner:** `Admin → Current → Upcoming Projects`.

**Theme:** per §31.15.

---

### 5.12 Contact — `/contact`

**Goal:** general communication only. Project inquiries must **not** be submitted through this page.

**Structure**

```text
New Projects → Email
General → Email
WhatsApp
Instagram
Vimeo
YouTube
Location
Availability
```

**Note (non-ambiguity):** `Availability` here is a plain informational line (the studio's availability status text). It is **not** the excluded `Booking / Availability` feature (§31) — no booking, calendar, or scheduling capability is implied.

**Routing**

```text
PROJECT REQUEST   → Start a Project
GENERAL QUESTION  → Contact
```

**Admin owner:** `Admin → Website → Global Settings`.

**Theme:** per §31.15.

---

### 5.13 Start a Project — `/start-project`

**Goal:** primary conversion page.

**Section 1 — Contact:** Full Name\*, Company, Email\*, WhatsApp.

**Section 2 — Project:** Service\*, Project Type\*, Project Description\*.

**Section 3 — Production:** Desired Date, Location, Budget Range, Expected Deliverables.

**Section 4 — References:** Reference URL, Attachment.

**Attachment constraints:** PDF, JPG, JPEG, PNG. Maximum 10 MB.

**Submit:** `Submit Project Brief`. Form UX per §31.21 and §31.22.

**Success state**

```text
Thank you.
Your project brief has been received.
Ocassio.Project will review your request.
```

**Admin destination:** `Admin → Business → Project Inquiries`.

**Theme:** per §31.15.

---

### 5.14 Privacy & Terms — `/privacy`, `/terms`

**Fields:** Title, Body, Updated Date, Status.

**Admin owner:** `Admin → Website → Legal`.

**Theme:** per §31.15.

---

## 6. Public User Flows

### 6.1 Portfolio Visitor

```text
HOME
↓
WORK
↓
PROJECT
↓
RELATED PROJECT
↓
ABOUT / JOURNAL
```

### 6.2 Potential Client

```text
HOME
↓
PROJECT
↓
SERVICES
↓
SERVICE DETAIL
↓
PRICING
↓
PROCESS
↓
START A PROJECT
↓
SUBMIT
```

### 6.3 Existing Follower

```text
HOME
↓
NOW / JOURNAL
↓
ARTICLE / PROJECT
```

### 6.4 Global rule

```text
NO DEAD-END PAGE
```

Every page must provide a logical next action.

---

## 7. Admin CMS Architecture

The Admin CMS is private, authenticated, role-aware and functional. It is the single management surface for every content type. It is light-first, compact and predictable (§31).

```text
ADMIN
│
├── Dashboard
│
├── Website
│   ├── Homepage
│   ├── Navigation
│   ├── Global Settings
│   └── Legal
│
├── Portfolio
│   ├── Projects
│   └── Categories
│
├── Services
│   ├── Services
│   ├── Pricing
│   ├── Process
│   └── FAQ
│
├── Journal
│   ├── Articles
│   └── Categories
│
├── Studio
│   ├── About
│   ├── Team
│   ├── Clients
│   └── Recognition
│
├── Current
│   └── Upcoming Projects
│
├── Media
│   └── Library
│
├── Business
│   └── Project Inquiries
│
├── Publishing
│   ├── Drafts
│   ├── Scheduled
│   └── Published
│
├── SEO
│
├── Users & Roles
│
├── Activity Log
│
└── Settings
```

Every module below maps to exactly one public content owner (see §16 matrix).

---

## 8. Admin Dashboard

The dashboard must be action-oriented. Avoid unnecessary charts.

**Overview widgets**

```text
CONTENT
Published Projects
Draft Projects
Scheduled Content

BUSINESS
New Inquiries
Open Inquiries

CURRENT
Coming Soon Projects
```

**Quick Actions**

```text
+ New Project
+ New Article
+ Upcoming Project
View Inquiries
```

**Supporting Sections**

```text
Recent Inquiries
Upcoming Publications
Recent Activity
```

---

## 9. Website Management

### 9.1 Homepage

**Sections:** Hero, Selected Work, Introduction, Featured Project, Services, Showreel, Process, Clients, Currently, Journal, CTA.

**Actions:** Edit, Show / Hide, Reorder, Preview, Publish.

The **Hero** and **final CTA** are mandatory and cannot be removed.

### 9.2 Navigation

**Default items:** Work, Services, Process, About, Journal, Contact.

**Actions:** Edit Label, Select Destination, Reorder, Show / Hide.

The primary CTA (`Start a Project`) is managed separately.

### 9.3 Global Settings

```text
Studio Name
Tagline
Location
Email
WhatsApp
Instagram
Vimeo
YouTube
Default CTA
Copyright
Default Social Image
Default SEO
```

This module is the owner of the Contact / Social content shown on the public site.

### 9.4 Legal

Fields: Title, Body, Updated Date, Status. Owner of Privacy and Terms pages.

---

## 10. Portfolio Management

### 10.1 Project List

**Columns:** Project, Client, Type, Status, Updated.

**Filters:** Status, Type, Category, Year.

**Actions:** Create, Edit, Preview, Duplicate, Publish, Unpublish, Archive, Delete.

The Work page and Project Detail pages read only projects where `Status = Published` and `Visibility = Public`.

### 10.2 Project Editor — Tabs

```text
01 Basic
02 Content
03 Media
04 Credits
05 Relations
06 SEO
07 Publishing
```

**Basic:** Project Title \*, Slug \*, Client, Project Type \*, Category \*, Year \*, Location, Short Description \*.

**Media:** Cover \*, Hero \*, Project Media.

**Content:** controlled block builder.

**Credits:** structured credits.

**Relations:** Services, Related Projects, Related Articles.

**SEO:** SEO Title, SEO Description, Social Image, Index.

**Publishing:** Visibility, Status, Publish Date, Featured, Homepage Feature.

### 10.3 Categories

Portfolio categories are managed here and drive project classification and the Work filters.

---

## 11. Publish Validation

A project cannot be published until all required data is complete. Example:

```text
Cannot Publish

Please resolve:

Hero image is required.
Project category is required.
Short description is required.
At least one content block is required.
```

**Rules**

```text
Slug must be unique.

Deleted relations must not create broken references.

Draft content must not appear on the public website.
```

The same validation principle applies to every publishable content type (services, articles, pricing, etc.).

---

## 12. Services Management

### 12.1 Services

Each service contains: Name, Slug, Cover, Short Description, Description, Who It Is For, Deliverables, Related Projects, Related Pricing, FAQ, SEO, Status.

**Actions:** Create, Edit, Preview, Publish, Unpublish, Archive, Delete.

### 12.2 Pricing

Each pricing entry contains: Service, Package Name, Price Type, Price, Duration, Deliverables, Notes, Display Order, Status.

**Price types:** Fixed, Starting From, Custom Quote.

If price type is `Custom Quote`, a numeric price value is not required.

### 12.3 Process

Default steps: 01 Inquiry, 02 Discovery, 03 Creative Direction, 04 Proposal, 05 Pre-production, 06 Production, 07 Post-production, 08 Review, 09 Delivery.

**Actions:** Create, Edit, Reorder, Hide, Delete.

### 12.4 FAQ

FAQ entries are managed here and surface on Service Detail pages.

---

## 13. Journal Management

**Article fields:** Title \*, Slug \*, Category \*, Cover \*, Excerpt \*, Content \*, Related Project, Author, SEO, Publishing.

**Status:** Draft, Scheduled, Published, Archived.

**Categories:** All, Project Stories, Behind The Scenes, Photography, Film, Studio Notes.

---

## 14. Studio Management

### 14.1 About

Singleton — only one About page exists.

### 14.2 Team

Fields: Name, Role, Photo, Short Bio, Display Order, Visibility.

### 14.3 Clients

Fields: Client Name, Logo, Website, Featured, Display Order.

### 14.4 Recognition

Fields: Title, Organization, Year, URL, Type.

**Type:** Publication, Award, Feature, Exhibition.

---

## 15. Current / Upcoming Project Management

**Fields:** Title, Project Type, Teaser, Location, Expected Release, Public Status, Related Project, Visibility.

**Public status:** In Production, Coming Soon.

**Visibility:** Public, Private.

---

## 16. Media Library

**Goal:** central source of truth for all media assets.

**Filters:** All, Images, Videos, plus Project, Type, Year, Usage.

**Asset fields:** Preview, Filename, Title, Alt Text, Caption, Credit, Copyright, Project, Usage, Upload Date.

**Actions:** Edit Metadata, Replace, Archive, Delete.

If an asset is still referenced:

```text
Cannot Delete

Used in:
Homepage
Project X
Article Y
```

### 16.1 Image Pipeline

Administrators upload the source image once; the system generates optimized variants.

```text
ORIGINAL
│
├── Thumbnail
├── Mobile
├── Tablet
├── Desktop
├── WebP
└── AVIF
```

The original high-resolution asset must never be served directly to the public website.

### 16.2 Focal Point

Each photograph may define a focal point. Purpose:

- Preserve correct portrait cropping.
- Prevent faces from being cropped unintentionally.
- Keep mobile crops compositionally safe.

---

## 17. Project Inquiry Management

**Pipeline**

```text
NEW
↓
REVIEWED
↓
CONTACTED
↓
DISCOVERY
↓
PROPOSAL SENT
↓
BOOKED
↓
COMPLETED
```

Alternative terminal state:

```text
DECLINED
```

**Inquiry Detail (from client):** Client, Company, Email, WhatsApp, Service, Project Type, Brief, Date, Location, Budget, Deliverables, References.

**Internal:** Status, Internal Notes, Assigned To, Activity.

This is a lightweight lead manager — not a full project management system. It is the destination for `Start a Project` submissions.

---

## 18. Publishing Workflow

```text
CREATE
↓
DRAFT
↓
VALIDATION
↓
PREVIEW
↓
PUBLISH
```

Scheduled path:

```text
DRAFT
↓
SCHEDULE
↓
AUTO PUBLISH
```

The public website reads only **Published Content**.

---

## 19. Version History

Required for: Homepage, Projects, Services, Pricing, Articles, About.

**Actions:** View, Compare, Restore.

---

## 20. Delete Flow

Avoid direct permanent deletion. Use:

```text
Archive
↓
Trash
↓
Permanent Delete
```

Destructive actions require confirmation.

---

## 21. Roles & Permissions

```text
Owner          → Full Access

Editor         → Website, Portfolio, Services, Journal, Studio, Current, Publishing

Media Manager  → Media Library

Sales          → Project Inquiries
```

Permissions must be enforced on the backend. Hiding buttons in the frontend is not sufficient authorization.

---

## 22. Activity Log

**Minimum fields:** Who, Action, Object, Timestamp.

Example:

```text
10:42   David published Human Motion.

10:20   Editor changed Portrait pricing.

09:52   Media Manager uploaded 12 images.

Yesterday   David restored Homepage Version 14.
```

---

## 23. CRUD UX Language

Use consistent action terminology:

```text
New
Edit
Save Draft
Preview
Publish
Unpublish
Archive
Delete
```

Do not mix synonyms such as `Save`, `Apply`, `Commit`, `Push`, `Go Live`, `Submit` when the underlying action is the same.

---

## 24. Public Content Ownership Matrix

| Public Content | Admin Location |
|---|---|
| Homepage | Website → Homepage |
| Navbar | Website → Navigation |
| Contact / Social | Website → Global Settings |
| Privacy / Terms | Website → Legal |
| Work | Portfolio → Projects |
| Project Detail | Portfolio → Projects |
| Service | Services → Services |
| Pricing | Services → Pricing |
| Process | Services → Process |
| FAQ | Services → FAQ |
| Journal | Journal → Articles |
| About | Studio → About |
| Team | Studio → Team |
| Clients | Studio → Clients |
| Recognition | Studio → Recognition |
| Coming Soon | Current → Upcoming Projects |
| Images / Videos | Media → Library |
| Start Project Leads | Business → Project Inquiries |

**Rule:** ONE PUBLIC CONTENT TYPE = ONE ADMIN OWNER.

---

## 25. System Architecture

### 25.1 Two Surfaces (source §1, §2)

```text
PUBLIC WEBSITE
→ audiences, prospective clients, showcasing creative work

ADMIN CMS
→ owners and editors manage all website content without touching the codebase
```

Primary objective chain: `SEE → FEEL → TRUST → UNDERSTAND → START A PROJECT`.

Ocassio.Project is a **digital creative studio platform**, not merely an online gallery. It must function as: portfolio, visual storytelling platform, creative studio profile, service showcase, pricing reference, project inquiry system, journal, project update / coming soon, and content management system.

### 25.2 Data Flow (source §2)

```text
OCASSIO.PROJECT
  ├── PUBLIC WEBSITE
  └── ADMIN CMS
        └── Authentication → Dashboard
              ├── Content  → Projects, Services, Pricing, Journal, Pages
              ├── Media    → Photos, Videos, Assets
              └── Business → Inquiries
PUBLISHED CONTENT
  → Database + Media Storage + Video Delivery
  → CDN / CACHE
  → PUBLIC WEBSITE
```

### 25.3 Architecture Rules (source §3)

**25.3.1 Single Source of Truth (§3.1).** Each data domain has exactly one primary editing location. The same data must never be independently editable from two different modules. Canonical examples: Project → `Portfolio → Projects`; Pricing → `Services → Pricing`; Instagram → `Website → Global Settings`; Homepage Hero → `Website → Homepage`.

**25.3.2 Content Flexible, Design Controlled (§3.2).** Administrators may Create, Read, Update, Delete, Reorder, Hide / Show, Preview, Schedule, Publish, Unpublish, Archive. Administrators must **not** modify: font system, core color system, responsive rules, grid system, component code, custom CSS, authentication logic, database schema, API logic. Objective: `ADMIN FREEDOM + DESIGN CONSISTENCY`.

### 25.4 Final System Loop (source §39)

```text
ADMIN → DASHBOARD → { CONTENT | MEDIA | BUSINESS }
CONTENT → Project / Service / Article / Pages
        → DRAFT → VALIDATION → PREVIEW → PUBLISH → WEBSITE → VISITOR
        → START A PROJECT → INQUIRY → ADMIN
```

### 25.5 Architecture Boundary (source §40)

Manageable by administrators without code changes: Projects, Photos, Videos, Homepage, Featured Work, Services, Pricing, Process, FAQ, Articles, About, Team, Clients, Recognition, Coming Soon, Navigation, Contact Information, Social Links, Legal Content, SEO Content, Project Inquiries.

Requires developer involvement: New Component Type, New Complex Interaction, New External Integration, New Database Structure, Authentication Changes, New Business Workflow, Major Layout Redesign, Payment System, Booking System, 3D / WebGL Experiences.

## 26. Database Schema

> The architecture document does **not** prescribe a literal schema. The entities below are **derived** from the documented admin modules and their editor fields (source §9–§23). They are recorded here to remove ambiguity. No relationship, entity, or field is introduced beyond what the specification documents.

### 26.1 Enumerations

```text
content_status        : draft | scheduled | published | archived
publish_visibility    : public | private
user_role             : owner | editor | media_manager | sales
media_type            : image | video
price_type            : fixed | starting_from | custom_quote
recognition_type      : publication | award | feature | exhibition
upcoming_status       : in_production | coming_soon
inquiry_status        : see §17 (pipeline stages + DECLINED)
project_block_type    : text_story | full_width_image | landscape_image | portrait_image |
                        image_pair | gallery | quote | video | behind_the_scenes | spacer
article_block_type    : paragraph | heading | image | image_gallery | quote | video |
                        project_reference
```

### 26.2 Entities

**users** — `id`, `name`, `email` (unique), `password_hash`, `role` (`user_role`), `status` (active | disabled), `last_login_at`, `created_at`, `updated_at`.

**activity_log** — `id`, `user_id` → users, `action`, `entity_type`, `entity_id`, `summary`, `metadata` (json), `created_at`. (source §28)

**version_history** — `id`, `entity_type`, `entity_id`, `version_no`, `snapshot` (json), `created_by` → users, `created_at`. Applies to the six entities in §19. (source §25)

**media_assets** — `id`, `filename`, `media_type`, `mime_type`, `width`, `height`, `file_size`, `storage_key`, `alt_text`, `credit`, `focal_point_x`, `focal_point_y`, `usage_state` (used | unused), `created_at`. (source §20, §22)

**media_variants** — `id`, `asset_id` → media_assets, `format` (thumbnail | mobile | tablet | desktop | webp | avif), `url`, `width`, `height`. Generated by the image pipeline; original RAW/TIFF stored only, never served. (source §21, §36)

**project_categories** — `id`, `name`, `slug`, `sort_order`. (source §12)

**projects** — `id`, `title`, `slug` (unique), `client_name`, `category_id` → project_categories, `work_type`, `year`, `hero_media_id` → media_assets, `short_description`, `status` (`content_status`), `visibility` (`publish_visibility`), `publish_at`, `sort_order`, `seo_meta_title`, `seo_meta_description`, `seo_og_media_id`, `created_by`, `created_at`, `updated_at`. (source §11–§12)

**project_blocks** — `id`, `project_id` → projects, `block_type` (`project_block_type`), `sort_order`, `media_id` → media_assets (nullable), `secondary_media_id` (image_pair), `alt_text`, `caption`, `credit`, `focal_point_x`, `focal_point_y`, `aspect_behavior`, `text_content` (quote / text_story). (source §6.3 Allowed Content Blocks, §31.17)

**project_credits** — `id`, `project_id` → projects, `role_label`, `person_or_entity`, `sort_order`. (source §6.3 Credits)

**project_relations** — `id`, `project_id` → projects, `related_project_id` → projects.

**services** — `id`, `name`, `slug`, `service_type`, `short_description`, `supporting_media_id` → media_assets, `sort_order`, `status`. (source §14)

**service_details** — `id`, `service_id` → services, `body_blocks` (json), `deliverables`, `created_at`, `updated_at`. (source §6.5)

**pricing** — `id`, `service_id` → services, `package_name`, `price_type` (`price_type`), `amount` (nullable — MUST be empty for `custom_quote`), `currency`, `duration`, `deliverables`, `notes`, `sort_order`, `status`. (source §15, §6.6)

**process_steps** — `id`, `step_number`, `title`, `explanation`, `sort_order`. Nine default steps; each step carries only number, title, explanation. (source §16, §6.7)

**faq** — `id`, `question`, `answer`, `sort_order`, `status`. (source §16)

**journal_categories** — `id`, `name`, `slug`, `sort_order`. (source §17)

**articles** — `id`, `title`, `slug` (unique), `category_id` → journal_categories, `cover_media_id` → media_assets, `excerpt`, `publish_date`, `reading_time`, `status` (`content_status`), `visibility` (`publish_visibility`), `publish_at`, `seo_meta_title`, `seo_meta_description`, `seo_og_media_id`, `created_by`, `created_at`, `updated_at`. (source §17, §6.9)

**article_blocks** — `id`, `article_id` → articles, `block_type` (`article_block_type`), `sort_order`, `text_content`, `media_id` → media_assets, `reference_project_id` → projects. (source §6.10 Allowed Blocks)

**studio_about** (singleton) — `id`, `heading`, `body`, `supporting_media_id`, `updated_at`. (source §18, §6.8)

**team_members** — `id`, `name`, `role_title`, `photo_media_id`, `bio`, `sort_order`, `status`. (source §18)

**clients** — `id`, `name`, `logo_media_id`, `sort_order`, `status`. (source §18)

**recognition** — `id`, `title`, `recognition_type` (`recognition_type`), `year`, `description`, `sort_order`, `status`. (source §18)

**upcoming_projects** — `id`, `title`, `upcoming_status`, `description`, `media_id`, `visibility` (public | private), `publish_at`, `sort_order`, `related_project_id`. `private` is MANDATORY for confidential projects. (source §19, §6.11)

**homepage_sections** — `id`, `section_key` (hero | selected_work | introduction | featured_project | services | showreel | process | clients_recognition | currently | journal | final_cta), `sort_order`, `enabled`, `content` (json). One row per section; Hero + CTA mandatory. (source §10.1, §6.1)

**navigation_items** — `id`, `label`, `target_type` (page | url), `target_ref`, `placement` (header | footer), `sort_order`, `enabled`. (source §10.2)

**site_settings** (singleton) — `id`, `contact_email`, `contact_phone`, `address`, `social_links` (json), `global_meta` (json), `updated_at`. Owns Contact / Social shown publicly. (source §10.3)

**legal_pages** — `id`, `title`, `slug`, `body`, `updated_date`, `status`. (source §6.14)

**inquiries** — Section 1 Contact: `full_name` *, `company`, `email` *, `whatsapp`. Section 2 Project: `service` *, `project_type` *, `project_description` *. Section 3 Production: `desired_date`, `location`, `budget_range`, `expected_deliverables`. Section 4 References: `reference_url`, `attachments` (json — PDF / JPG / JPEG / PNG, max 10 MB each). Fields marked * are required. Plus `status` (`inquiry_status`), `created_at`, `updated_at`. (source §23, §6.13)

### 26.3 Key Relationships

```text
projects 1─*  project_blocks, 1─* project_credits, *─* projects (project_relations),
         *─1  project_categories, *─1 media_assets (hero)

services 1─*  pricing, 1─1 service_details

journal_categories 1─* articles;  articles 1─* article_blocks

media_assets 1─* media_variants
media_assets referenced by many entities — referencing NEVER duplicates the file (§31.38)

users 1─*  activity_log, 1─* version_history
```

### 26.4 Lifecycle & Deletion

- `content_status` governs draft / scheduled / published / archived; archived items enter Trash via the Delete Flow (source §26).
- Version History applies to the six entities named in §19.
- Media Usage Protection blocks deletion of assets still referenced anywhere (see §11 §16).

## 27. Tech Stack

> `pipeline.json` records `techStack` as `ai-pilih` for backend, database, frontend, and deployment. **No stack is mandated by the architecture document.** This section therefore records the *constraints the chosen stack must satisfy* — not a binding technology choice.

**Constraints the stack must satisfy:**

- **Server-side authentication + role enforcement** for the four roles (Owner, Editor, Media Manager, Sales), with permission-aware UI rendering (source §27, §31.28).
- **Media pipeline** that generates delivery-ready variants (Thumbnail → … → AVIF), keeps original RAW / TIFF as storage-only, and never serves originals directly (source §21, §36).
- **CDN / cache layer** in front of database, media storage, and video delivery (source §2).
- **Relational data model** consistent with §26 (single source of truth per domain, §3.1).
- **Scheduled publishing** support (source §24).
- **Object storage** for media and video delivery (poster-first; §31.23).
- **Accessibility**: keyboard-operable controls, ~44px minimum tap targets (source §31.28).
- **Motion**: respect `prefers-reduced-motion` (source §31.25).

**Explicit non-goals (source §40–§41):** payment system, booking system, 3D / WebGL experiences, client portal, print store, and the other items listed in §41.

**Decision note (non-ambiguity):** "InsForge" appears **nowhere** in the architecture document nor in this PRD. It was mentioned erroneously in earlier conversation and is **not** part of this specification. The stack remains an open, explicitly-flagged decision.
---

## 28. Design System

> **Source:** architecture spec §31 (Integrated Visual Design System). Every subsection below is labelled with its source number, e.g. `28.14 Homepage Visual Theme Map (source §31.14)`. References elsewhere in this PRD written as "(§31.x)" resolve to these subsections.

The final visual language covers both the public website and the Admin CMS. Direction:

```text
PUBLIC PORTFOLIO          → cinematic · immersive · image-first · restrained UI
PUBLIC INFORMATION PAGES  → editorial · clean · premium · readable
ADMIN CMS                 → functional · clear · compact · predictable
```

Photography and film must supply most of the visual emotion. The interface must not compete with the work.

### 28.1 Locked Color System (source §31.1)

The following palette is authoritative. **No additional UI brand colors may be introduced.**

```text
BRAND
└── Primary             #171717

LIGHT MODE
├── Background          #FAFAFA
├── Background Alt      #F5F5F5
├── Surface             #FFFFFF
├── Surface Hover       #F2F2F2
├── Text Primary        #171717
├── Text Secondary      #525252
├── Text Muted          #737373
├── Border              #E5E5E5
└── Strong Border       #D4D4D4

DARK MODE
├── Background          #171717
├── Background Deep     #0A0A0A
├── Surface             #202020
├── Surface Hover       #2A2A2A
├── Text Primary        #F5F5F5
├── Text Secondary      #D4D4D4
├── Text Muted          #A3A3A3
├── Border              #333333
└── Strong Border       #525252

PRIMARY CTA — LIGHT      Background #171717 · Text #FAFAFA
PRIMARY CTA — DARK       Background #F5F5F5 · Text #171717

SEMANTIC
Success #22C55E · Warning #F59E0B · Error #EF4444 · Info #3B82F6
```

Semantic colors are for functional system feedback only (Success → publish/upload/inquiry saved; Warning → optional SEO missing, unsaved changes; Error → required field missing, upload failed, permission denied, publish validation failed; Info → scheduled publish, informational notice). **Never use semantic colors as decorative brand accents.**

### 28.2 Color Usage Rules (source §31.2)

Light surfaces: page background `#FAFAFA`, alternate section `#F5F5F5`, cards/inputs `#FFFFFF`, primary text `#171717`, body text `#525252`, muted metadata `#737373`, default border `#E5E5E5`, strong/focus border `#D4D4D4`.

Dark surfaces: page background `#171717`, deep immersive `#0A0A0A`, cards/elevated `#202020`, hover `#2A2A2A`, primary text `#F5F5F5`, body text `#D4D4D4`, muted metadata `#A3A3A3`, default border `#333333`, strong border `#525252`.

Atmospheric effects: no pastel UI gradients. Atmosphere comes from photography, video, soft image blur, subtle opacity, light/dark tonal transitions, and very restrained monochrome overlays. Any overlay must derive from the black/white palette using opacity. **The media supplies color; the interface stays neutral.**

### 28.3 Typography System (source §31.3)

Two-family editorial system: `DISPLAY` = light editorial serif; `BODY / UI` = Inter.

- Display font preferred: **Waldenburg Light, weight 300** — use only when a licensed font asset is available.
- Build-safe fallback: **EB Garamond, weight 400** (or nearest visually stable light weight).
- Do not download or bundle unlicensed font files.
- Inter weights: `400` body; `500` navigation, controls, buttons, form labels; `600` compact labels, small status emphasis. Avoid heavy 700/800 except when a future brand direction explicitly requires it.

### 28.4 Typography Scale (source §31.4)

Desktop target:

| Token | Size | Weight | Line Height | Letter Spacing | Main Use |
|---|---:|---:|---:|---:|---|
| Display Mega | 64px | 300/400 | 1.05 | -0.03em | Homepage hero |
| Display XL | 48px | 300/400 | 1.08 | -0.02em | Page hero |
| Display LG | 36px | 300/400 | 1.17 | -0.01em | Section title |
| Display MD | 32px | 300/400 | 1.15 | -0.01em | Sub-section |
| Display SM | 24px | 300/400 | 1.20 | 0 | Card/editorial title |
| UI Title MD | 20px | 500 | 1.35 | 0 | Admin/card title |
| UI Title SM | 18px | 500 | 1.40 | 0 | List/group title |
| Body MD | 16px | 400 | 1.60 | +0.01em | Standard body |
| Body Strong | 16px | 500 | 1.60 | +0.01em | Emphasis |
| Body SM | 15px | 400 | 1.50 | +0.01em | Secondary text |
| Caption | 14px | 400 | 1.50 | 0 | Captions / metadata |
| Label | 12px | 600 | 1.40 | +0.08em | Uppercase compact labels |
| Button | 15px | 500 | 1.00 | 0 | Buttons |
| Nav | 15px | 500 | 1.40 | 0 | Navigation |

Rules: display typography is never visually heavy, uses short copy and generous breathing room; body typography optimizes readability and never uses display serif for long paragraphs; Admin is primarily Inter (display serif optional, limited to login/brand moments).

### 28.5 Responsive Typography (source §31.5)

```text
MOBILE < 640px
Display Mega  64px → clamp around 32–40px
Display XL    48px → 32px
Display LG    36px → 28px
Body          16px minimum for forms and main reading text
```

Use CSS `clamp()` where appropriate. Do not reduce important body text below 16px merely to fit content.

### 28.6 Spacing System (source §31.6)

Base unit `4px`. Approved tokens: `4 / 8 / 12 / 16 / 20 / 24 / 32 / 48 / 64 / 96 / 128` px.

Recommended use: 4–8px inline micro; 12–16px form/control internal; 20–24px card/component; 32–48px component groups; 64–96px normal page section; 96–128px major editorial transitions on desktop. Do not use arbitrary values (e.g. 37px/73px/111px) unless required for a specific media ratio or optical correction.

### 28.7 Grid & Container (source §31.7)

Standard content container: max width `1200px`; horizontal padding desktop `32–48px`, tablet `24–32px`, mobile `20px`. Grid: 12-column editorial on desktop; gaps desktop 24px, tablet 20px, mobile 16px.

Full-bleed exception — photography/video may intentionally escape the container for: hero media, project photography, showreel, film frames, selected editorial compositions. **Text content should remain constrained for readability.**

### 28.8 Whitespace Philosophy (source §31.8)

Whitespace is part of the brand: it slows the reading rhythm, creates focus, separates project moments, makes photography feel valuable, and avoids dashboard-like density on the public site. Public pages use generous whitespace; Admin pages use efficient whitespace. **Do not copy public-site spacing into Admin CMS.**

### 28.9 Shape System (source §31.9)

Radius tokens: `None 0 · XS 4 · SM 6 · MD 8 · LG 12 · XL 16 · Pill 9999 · Full 9999`.

Usage: primary/secondary CTA → Pill; status chips → Pill; inputs → 8px; admin panels → 8–12px; editorial cards → 0–12px depending on media treatment; large photography → usually 0px or subtle radius only. Rule: **do not round every rectangle.** The site must not look like a generic SaaS template.

### 28.10 Borders, Depth & Elevation (source §31.10)

Ocassio uses hairline borders + very subtle shadow + media contrast — not heavy elevation. Light borders: default `#E5E5E5`, strong `#D4D4D4`. Dark borders: default `#333333`, strong `#525252`. Shadow is minimal, derived from dark neutral opacity. Intent: card resting → flat/border only; card hover → subtle lift or slight tonal shift; modal → stronger separation allowed. **No multi-layer neon glow.**

### 28.11 Primary Button (source §31.11)

Light: background `#171717`, text `#FAFAFA`. Dark: background `#F5F5F5`, text `#171717`. Geometry: height 40–44px, horizontal padding 20px, Pill radius, Inter 15px/500. States: Default, Hover, Pressed, Focus Visible, Disabled, Loading. Hover uses only approved palette values (tonal change within the neutral treatment). **Do not introduce a new accent color for hover.**

### 28.12 Secondary & Tertiary Actions (source §31.12)

Secondary: transparent background, 1px border, theme-appropriate text, Pill radius. Tertiary: text only, optional arrow icon, no filled background. Hierarchy: 1 primary action + optional secondary action + tertiary links. **Avoid multiple competing filled buttons inside the same section.**

### 28.13 Public Top Navigation (source §31.13)

Desktop: height 64px minimum. Left → Ocassio.Project identity; Main → Work, Services, Process, About, Journal, Contact; Right → Start a Project.

Behavior: transparent or theme-integrated at top where media requires it; on scroll may transition to a stable surface, preserve high text contrast, and not obscure media unnecessarily.

Mobile: brand + menu trigger; the expanded menu must include Work, Services, Process, About, Journal, Contact, Start a Project. **No hidden essential navigation.**

### 28.14 Homepage Visual Theme Map (source §31.14)

Use as the default implementation:

```text
NAVBAR      Adaptive to current section
01 HERO              DARK   — cinematic media-first
02 SELECTED WORK     DARK   — immersive
03 OCASSIO INTRODUCTION  LIGHT — editorial reset
04 FEATURED PROJECT  DARK   — visual focus
05 SERVICES          LIGHT  — structured / readable
06 SHOWREEL          DARK   — film-first
07 HOW WE WORK       LIGHT  — editorial
08 CLIENTS / RECOGNITION  LIGHT — quiet trust section
09 CURRENTLY / COMING SOON  DARK (or media-led; dark by default)
10 JOURNAL           LIGHT  — editorial
11 START A PROJECT   LIGHT  — high clarity conversion
FOOTER               LIGHT by default
```

Theme changes must feel intentional; use spacing/media transitions rather than flashy theme-switch animations.

### 28.15 Page Theme Defaults (source §31.15)

| Page | Default Theme |
|---|---|
| Home | Mixed, mapped above |
| Work | Dark |
| Project Detail | Dark |
| Services | Light |
| Service Detail | Light |
| Pricing | Light |
| Process | Light |
| About | Light |
| Journal | Light |
| Article Detail | Light |
| Now | Dark |
| Contact | Light |
| Start a Project | Light |
| Privacy / Terms | Light |
| Admin CMS | Light-first |

Dark mode on portfolio pages is **not** a user-preference toggle requirement — it is part of page art direction. A future global theme toggle should not be added unless explicitly requested.

### 28.16 Project Card (source §31.16)

Structure: Media → Project Name → Client / Type → Year. Image dominates; metadata stays quiet. No card border unless necessary; no unnecessary icon row; no excessive hover overlay text. Hover: subtle media scale OR crop shift + a View Project indicator. **Do not stack multiple simultaneous effects.**

### 28.17 Project Detail Media Components (source §31.17)

Approved components: Full Bleed Image, Contained Landscape, Contained Portrait, Image Pair, Editorial Grid, Gallery, Video, BTS Strip, Quote, Text Story Block, Credits, Related Project. Each media block must support: Asset, Alt Text, optional Caption, optional Credit, Focal Point, Aspect Ratio behavior. **No layout block may require custom code from the Admin.**

### 28.18 Service Card (source §31.18)

Structure: Service Name, Short Description, optional Supporting Image, optional Starting Price, View Service. Light theme by default. Avoid SaaS-style feature icon grids, fake metric badges, decorative gradients.

### 28.19 Journal Card (source §31.19)

Structure: Cover, Category, Title, Publish Date, Reading Time. Design: editorial, image + typography, minimal chrome. Use borders only where they aid grouping.

### 28.20 Pricing Presentation (source §31.20)

Photography pricing should not look like software subscriptions. Prefer editorial pricing rows or restrained package panels. Each entry shows only relevant information: Service, Package, Price Type, Price / Custom Quote, Duration, Deliverables, Notes, CTA. Avoid recommended neon badges, fake discount ribbons, three-column SaaS comparison clichés.

### 28.21 Forms (source §31.21)

Fields: height 44–48px minimum; radius 8px; background theme surface; border theme border; text theme primary; placeholder theme muted. States: Default, Hover, Focus, Filled, Error, Disabled. Focus must be visually obvious. Errors must identify the specific field, explain what is wrong, and explain how to fix it. **Never show only "Invalid input" when a specific explanation is possible.**

### 28.22 Start a Project Form UX (source §31.22)

Form should remain one coherent workflow. Recommended grouping: `01 CONTACT → 02 PROJECT → 03 PRODUCTION → 04 REFERENCES → 05 REVIEW / SUBMIT`. Desktop may display sections with strong grouping; mobile remains single-column. Do not create a multi-step wizard unless real form length later proves it necessary. Required fields use consistent `*` treatment. Before submit: validate locally **and** validate on server. After successful submit: clear success confirmation, and do not accidentally resubmit on refresh.

### 28.23 Video & Showreel Component (source §31.23)

Default behavior: poster image first, play on interaction, controls accessible, no surprise autoplay with sound. Muted visual background loops are allowed only for cinematic hero treatment; if background autoplay is used it must be `muted`, `playsinline`, `loop`, short, optimized, non-blocking. **Provide a static fallback poster.**

### 28.24 Cursor & Hover Contrast (source §31.24)

Any custom cursor/highlight must adapt to local contrast: light section → dark cursor/highlight; dark section → light cursor/highlight. Never merge into text or background; never hide native usability cues; native cursor is the fallback; on touch devices custom cursor is disabled. Custom cursor is decorative enhancement, not navigation logic.

### 28.25 Motion Principles (source §31.25)

Motion must be slow enough to feel premium, fast enough to remain responsive, purposeful, subtle, interruptible. Categories: page/section reveal, media hover, navigation transition, theme transition, modal/drawer, toast, loading state. Avoid continuous decorative motion everywhere, scroll hijacking, long forced intro sequences, cursor trails, heavy parallax on every section, and animation that delays content access. **Respect `prefers-reduced-motion`.**

### 28.26 Responsive Breakpoints (source §31.26)

```text
Mobile   < 640px
Tablet   640–1023px
Desktop  1024–1279px
Wide     >= 1280px
```

These are layout guidance, not rigid device detection.

### 28.27 Responsive Collapse Rules (source §31.27)

Navigation: desktop horizontal nav → mobile menu below tablet threshold. Public grids: 3 columns → 2 → 1 depending on content. Project Image Pair: desktop two-column where composition permits → mobile stack vertically. Admin: desktop sidebar → collapsible sidebar/drawer on smaller screens. **Never hide required administrative actions solely because the viewport is smaller.**

### 28.28 Touch & Accessibility Targets (source §31.28)

Interactive controls should target approximately **44px minimum effective tap area**. Small visual icons may exist inside a larger clickable region. All buttons, links, menu triggers, pagination, media controls, and admin row actions must remain operable by keyboard where relevant.

### 28.29 Admin Visual System (source §31.29)

The Admin CMS is light-first. Base: background `#FAFAFA`, surface `#FFFFFF`, text primary `#171717`, text secondary `#525252`, border `#E5E5E5`. Admin prioritizes information clarity, table readability, form consistency, predictable actions, compact density, and visible system status. The Admin CMS must **not** use cinematic dark backgrounds by default, oversized display headlines, decorative hero sections, portfolio-style transitions, or large ornamental photography.

### 28.30 Admin Layout (source §31.30)

Desktop: persistent sidebar (Dashboard, Website, Portfolio, Services, Journal, Studio, Current, Media, Business, Publishing, SEO, Users, Activity) + header + main workspace. Sidebar: persistent on desktop, collapsible if needed, clear active state, icons optional, **text labels mandatory**.

### 28.31 Admin Page Pattern (source §31.31)

Every management page follows: PAGE TITLE → short helper text optional → PRIMARY ACTION `+ New [Content Type]` → FILTERS / SEARCH → CONTENT LIST / TABLE → PAGINATION → EMPTY STATE when no data. Example: `Projects — Manage portfolio projects. [+ New Project] Search · Status · Category · Year | Project · Client · Type · Status · Updated · Actions`. **Do not hide the main CRUD action inside a menu.**

### 28.32 Admin Table Rules (source §31.32)

Use tables for: Projects, Articles, Clients, Inquiries, Users, Activity, Scheduled Content. Guidelines: clear column titles, row hover, status visible, primary object name clickable, predictable actions, bulk actions only where justified, horizontal scrolling allowed on small screens if necessary. **Do not turn every table row into a large visual card.**

### 28.33 Admin Editor Pattern (source §31.33)

Each editor uses a sticky/visible action area (Save Draft, Preview, Publish / Update), a main editor of structured fields, and secondary metadata (SEO, Publishing, Relations). If tabs are used, **do not hide validation errors** — a publish attempt must summarize errors across all tabs.

### 28.34 Status Chips (source §31.34)

Status chips carry semantic meaning: Published, Draft, Scheduled, Archived, Private, New Inquiry, Proposal Sent, Completed, Declined. Use neutral chips for lifecycle states unless semantic urgency exists. Reserve green → success/completed; amber → warning/pending attention; red → error/destructive/failed; blue → informational state. **Do not color every status brightly.**

### 28.35 Admin Empty States (source §31.35)

Empty states explain what this area is, why it is empty, and what the administrator should do next. Example: `No projects yet. Create the first project to begin populating the Work page. [+ New Project]`. Avoid decorative filler copy.

### 28.36 Admin Confirmation Dialogs (source §31.36)

Required for: Delete, Permanent Delete, Unpublish, Restore Version, Change User Role, Remove Used Media, Discard Unsaved Changes. A dialog must state the object affected, the consequence, and whether the action is reversible. Destructive primary action uses the Error semantic color.

### 28.37 Toasts & System Feedback (source §31.37)

Use concise feedback, e.g. `Project saved as draft.` / `Project published.` / `Upload completed.` / `Could not publish. Fix 3 validation issues.` **Do not use vague messages** such as `Success!` or `Something went wrong.` when a more specific message is available.

### 28.38 Media Picker UX (source §31.38)

When selecting media from the CMS: Search, Filter, Preview, Select, Upload New. Administrators must be able to identify filename, project relationship, type, dimensions where useful, and usage state. **Selecting an asset does not duplicate the file — it creates a reference to the existing media asset.**

### 28.39 Media Ratios (source §31.39)

Do not force all photography into one ratio. Supported editorial ratios may include: Original, Landscape, Portrait, Square, Cinematic. The original image remains the source; the frontend crops/frames through layout rules and focal point. Avoid destructive crop at upload unless explicitly chosen.

### 28.40 Performance-Aware Design (source §31.40)

Rules: hero image/video explicitly prioritized; below-fold images lazy load; responsive images use size-appropriate sources; video poster-first; gallery progressive load; RAW/TIFF never public delivery; animations use transform/opacity where possible. Do not sacrifice image quality blindly — optimize dimensions, encoding, and delivery instead.

### 28.41 Design Do's (source §31.41)

DO: let photography provide visual color; use neutral UI chrome; use large but restrained editorial typography; preserve generous whitespace on public pages; keep CTA hierarchy obvious; use dark environments for immersive work; use light environments for reading and business information; use hairline borders; keep motion subtle; make Admin straightforward and compact; reuse the same component tokens everywhere.

### 28.42 Design Don'ts (source §31.42)

DO NOT: add pastel/neon UI colors; add gradients as button fills; create glassmorphism-heavy sections; use rounded cards everywhere; use giant text only to appear modern; add marquees without information value; add decorative floating orbs; create excessive bento grids; animate every component; turn pricing into SaaS tiers by default; place text over busy photography without sufficient contrast; use different typography rules on every page; add new design tokens ad hoc.

### 28.43 Component Token Discipline (source §31.43)

Implementation uses reusable tokens; **never hardcode repeated values across components.** Conceptual token structure: `colors.* · typography.* · spacing.* · radius.* · border.* · container.* · breakpoint.* · motion.*`. Components consume tokens — e.g. `PrimaryButton → theme CTA background + theme CTA text + button typography + pill radius + standard button height`.

### 28.44 Design QA Checklist (source §31.44)

Before a page is complete:

```text
[ ] Correct page theme applied
[ ] Approved palette only
[ ] Typography hierarchy consistent
[ ] CTA hierarchy clear
[ ] No unnecessary decorative component
[ ] Desktop responsive behavior verified
[ ] Tablet verified
[ ] Mobile verified
[ ] Keyboard interactions verified where relevant
[ ] Focus states visible
[ ] Text/media contrast readable
[ ] Images use correct focal point
[ ] Video has poster/fallback
[ ] Reduced-motion behavior respected
[ ] No content overflow
[ ] No accidental horizontal page scroll
[ ] Empty/loading/error states handled
[ ] Admin data maps to the correct public page
```

### 28.45 Theme & Experience Strategy (source §32)

The experience intentionally uses contextual themes rather than one visual canvas everywhere. DARK → work, photography, video, showreel, immersive project storytelling. LIGHT → about, services, pricing, process, journal reading, contact, inquiry, admin management. Theme is an editorial decision; it must not create confusion in navigation or interaction behavior. The same navigation logic, button hierarchy, spacing system, type system, and interaction rules must remain consistent across both themes.

### 28.46 Design-System Relationship to CMS (source §33)

The CMS manages **content**; the frontend design system manages **presentation**. Admin input (Project Title, Hero Image, Description, Gallery, Credits, Related Project) → design system (Project Hero, Editorial Text Block, Full Bleed Media, Image Pair, Credits Layout, Related Work Layout) → public page. **Administrators do not define arbitrary CSS. Administrators compose pages using approved content blocks only.** This separation is mandatory.

### 28.47 Component Ownership (source §34)

Public components: Navbar, Footer, Primary CTA, Secondary CTA, Project Card, Project Hero, Project Content Blocks, Service Card, Pricing Entry, Process Step, Journal Card, Article Blocks, Coming Soon Card, Contact Information, Inquiry Form, Media Player.

Admin components: Sidebar, Header, Data Table, Search, Filter, Pagination, Editor Form, Block Builder, Media Picker, Upload, Status Chip, Confirmation Dialog, Toast, Version History, Role Selector, Activity Log.

Shared behavior: validation, loading, error, empty, disabled, focus, permission-aware rendering.

### 28.48 Responsive Principles (source §35)

The public website must be designed intentionally for Mobile, Tablet, Desktop, Wide Desktop. Mobile → readable, fast, simple navigation, correct media crop, tap-friendly. Desktop → immersive, editorial composition, larger photography, richer spacing. **Mobile is not a scaled-down desktop.** Composition may change; information hierarchy may not.

### 28.49 Media Performance Rules (source §36)

Hero media → high priority; first visible project media → normal/high based on LCP role; below fold → lazy; video → poster-first; background video → muted + optimized + optional; gallery → progressive; original RAW/TIFF → storage only, never directly served. Admin uploads must automatically generate or trigger delivery-ready media variants.

---

## 29. Validation & Error Prevention

> **Source:** architecture spec §37.

The system must include:

```text
Required Field Validation
Unique Slug Validation
Relation Validation
Media Usage Protection
Publish Validation
Role Validation
Preview Before Publish
Version History
Destructive Action Confirmation
Broken Link Protection
Responsive Testing
CRUD Integration Testing
Authentication Testing
Authorization Testing
Form Validation Testing
Media Optimization
Backup / Recovery
```

The goal is not to promise zero bugs. The goal is to **MINIMIZE** ambiguity, human error, broken content, and regression.

---

## 30. Admin CRUD Flow

> **Source:** architecture spec §38.

All modules must follow the same interaction pattern:

```text
MODULE LIST → CREATE / SELECT → EDITOR → SAVE DRAFT → VALIDATE → PREVIEW → PUBLISH
```

Administrators should not need to learn a different workflow for each module.

---

## 31. Exclusions

> **Source:** architecture spec §41.

The following are intentionally excluded from the core architecture until a clear business requirement exists:

```text
Testimonials / Client Stories
Client Portal
Booking / Availability
Print Store
Photography Licensing
Press / Media Kit
Locations
Careers / Collaboration
Studio Rental
Equipment Rental
Dedicated Testimonials Page
```

Rule: **DO NOT ADD A PAGE WITHOUT A CLEAR BUSINESS PURPOSE.**

**Cross-reference (non-ambiguity note):** this list is why `Availability Check` and a testimonials/client-stories surface are absent from the PRD sitemap and roadmap. `Newsletter Signup` is likewise absent because no newsletter or subscription exists anywhere in the architecture spec (§0–§42).

---

## 32. Final Direction

> **Source:** architecture spec §42.

Public website direction: Simple · Cinematic · Editorial · Memorable · Premium · Image-first · Easy to understand · Easy to navigate.

Admin CMS direction: Clear · Functional · Structured · Predictable · Safe · No-code content management.

Final architecture philosophy:

```text
SIMPLE IN FRONT
POWERFUL IN BACK
CONTROLLED BY DESIGN
MANAGED WITHOUT CODE
```

Ocassio.Project should guide visitors through: **Discovery → Admiration → Understanding → Trust → Collaboration.**

The Admin CMS should guide administrators through: **Create → Manage → Preview → Publish → Monitor** — without ambiguity.

---

## 33. Appendix A — Roadmap Migration Target (Planning Aid)

> **Status:** planning aid, **not** product specification. Sections §1–§32 remain the single source of truth. This appendix only maps the existing **v1 roadmap** (37 features) to the **v3 PRD target** so a roadmap regeneration can be validated item by item. It is safe to remove once the roadmap has been rebuilt.

### 33.1 Target — Public Pages (14)

| # | Page | Route | PRD ref |
| --- | --- | --- | --- |
| 1 | Home | `/` | §5.1 |
| 2 | Work | `/work` | §5.2 |
| 3 | Project Detail | `/work/[slug]` | §5.3 |
| 4 | Services | `/services` | §5.4 |
| 5 | Service Detail | `/services/[slug]` | §5.5 |
| 6 | Pricing | `/pricing` | §5.6 |
| 7 | Process | `/process` | §5.7 |
| 8 | About | `/about` | §5.8 |
| 9 | Journal | `/journal` | §5.9 |
| 10 | Article Detail | `/journal/[slug]` | §5.10 |
| 11 | Now | `/now` | §5.11 |
| 12 | Contact | `/contact` | §5.12 |
| 13 | Start a Project | `/start-project` | §5.13 |
| 14 | Privacy & Terms | `/privacy`, `/terms` | §5.14 |

### 33.2 Target — Admin CMS Modules

| Module | PRD ref |
| --- | --- |
| CMS Architecture | §7 |
| Dashboard | §8 |
| Website Management (Homepage · Navigation · Global Settings · Legal) | §9.1–§9.4 |
| Portfolio (Project List · Editor Tabs · Categories) | §10.1–§10.3 |
| Publish Validation | §11 |
| Services (Services · Pricing · Process · FAQ) | §12.1–§12.4 |
| Journal (Articles · Categories) | §13 |
| Studio (About · Team · Clients · Recognition) | §14.1–§14.4 |
| Current / Upcoming | §15 |
| Media Library (Image Pipeline · Focal Point) | §16.1–§16.2 |
| Project Inquiries (Business) | §17 |
| Publishing Workflow | §18 |
| Version History | §19 |
| Delete Flow | §20 |
| Roles & Permissions (Users) | §21 |
| Activity Log | §22 |
| SEO | §7 sidebar tree; fields in §9.3, §10.2 |
| Settings | §7 sidebar tree |

### 33.3 Forbidden in v1 — remove

| v1 feature | File | Reason |
| --- | --- | --- |
| Availability Check | `availability-check-6fbda65f` | *Booking / Availability* is explicitly excluded (§31) |
| Newsletter Signup | `newsletter-signup-91a6f645` | No newsletter/subscription exists anywhere in §0–§42 |

> **Note:** `Enquiry & Newsletter` (`enquiry-newsletter-748027fd`) is **not** a full removal — only its newsletter part is forbidden. Its inquiry function stays valid and is therefore handled as a **re-scope** in §33.4.

### 33.4 Legacy features to re-scope (not delete) — 6 features

| v1 feature | Conflict | Correct direction |
| --- | --- | --- |
| Contact Form | PRD removes the enquiry form on Contact | Contact = general communication only; project requests → **Start a Project** (§5.12, §5.13) |
| Services & Pricing | Merges two distinct entities | Split: **Services** (§5.4) and **Pricing** 3 tiers (§5.6) |
| Values & Process | "Values" is not a standalone sitemap page | **Process** = 9 steps (§5.7); studio values belong to **About** (§5.8) |
| Project Gallery | v1 naming | Align to **Work** with 8 filters (§5.2) |
| Info Pages | v1 naming | Align to **Privacy / Terms** via **Website → Legal** (§5.14, §9.4) |
| Enquiry & Newsletter | Bundles a forbidden newsletter with an inquiry form | **Re-scope:** drop the newsletter part; route inquiry to **Start a Project** (§5.13) / **Project Inquiries** (§17) |

### 33.5 Targets with **no v1 representation** (must be created)

Public: **Service Detail** (§5.5) · **Journal** (§5.9) · **Article Detail** (§5.10) · **Now** (§5.11) · **Start a Project** (§5.13) · **Pricing** & **Process** as standalone pages.

CMS: **Dashboard** (§8) · **Website Management** (§9) · **Portfolio → Categories** (§10.3) · **Services → FAQ** (§12.4) · **Journal → Articles/Categories** (§13) · **Studio → Team/Clients/Recognition** (§14.2–§14.4) · **Current / Upcoming** (§15) · **Business → Project Inquiries** (§17) · **SEO** (sidebar) · **Activity Log** (§22) · **Settings**.

Systems: **Publish Validation** (§11) · **Image Pipeline** + **Focal Point** (§16.1–§16.2).

**Note (non-ambiguity):** *Publish Validation* here is the **publish gate/module** (blocks publishing + returns an issue list, §11/§29) — a distinct artifact from the v1 *Field Validation* (per-field input validation) mapped in §33.6 as **keep**. Related, but not the same component.

### 33.6 v1 → v3 mapping (all 37)

| v1 feature (phase) | v3 target | Action |
| --- | --- | --- |
| Category Browsing (1) | Work filters §5.2 | merge |
| Hero Headline (1) | Home §5.1 | merge |
| Project Gallery (1) | Work §5.2 | re-scope |
| Featured Projects (1) | Home featured work §5.1 | keep |
| Home Landing (1) | Home §5.1 | keep |
| Gallery Grid (1) | Work grid §5.2 | keep |
| Menu & Contact Bar (1) | Navigation §9.2 | keep |
| Project Detail (1) | Project Detail §5.3 | keep |
| Footer & Links (1) | Navigation / Global §9.2–§9.3 | keep |
| Full-Screen Viewer (1) | Project Detail media §5.3, §16 | keep |
| Contact Form (2) | Contact §5.12 | re-scope |
| About Studio (2) | About §5.8 / Studio §14.1 | keep |
| Services & Pricing (2) | Services §5.4 + Pricing §5.6 | split |
| Availability Check (2) | — | **delete** |
| Values & Process (2) | Process §5.7 | re-scope |
| Info Pages (2) | Privacy/Terms §5.14 | re-scope |
| Newsletter Signup (2) | — | **delete** |
| Enquiry & Newsletter (2) | Project Inquiries §17 / Start a Project §5.13 | re-scope |
| Upload Photos (3) | Media Library §16 | keep |
| Content Types (3) | CMS architecture §7 | keep |
| Secure Sign In (3) | Roles §21 | keep |
| Add & Edit (3) | CRUD UX §23 | keep |
| Auto Optimize (3) | Image Pipeline §16.1 | keep |
| Role Access (3) | Roles §21 | keep |
| Sign Out & Session (3) | Roles §21 | keep |
| Delete Protection (3) | Delete Flow §20 | keep |
| Organize Media (3) | Media Library §16 | keep |
| Alt Text & Details (3) | Media/SEO fields §9.3, §10.2 | keep |
| Field Validation (3) | Validation §11, §29 | keep |
| Admin Sign-in & Roles (3) | Roles §21 | keep |
| Media Library (3) | Media Library §16 | keep |
| Content Manager (3) | CMS architecture §7 | keep |
| Draft & Preview (4) | Publishing Workflow §18 | keep |
| Publish & Unpublish (4) | Publishing Workflow §18 | keep |
| Scheduled Publishing (4) | Publishing Workflow §18 | keep |
| Archive & Version History (4) | Version History §19 | keep |
| Publishing & Scheduling (4) | Publishing Workflow §18 | keep |

### 33.7 Suggested execution order

1. **Foundations** — CMS Architecture §7, Database Schema §26, Design System §28, Roles §21.
2. **CMS core** — Website §9, Portfolio §10, Media §16, Publish Validation §11, Publishing §18.
3. **CMS extended** — Services §12, Journal §13, Studio §14, Current §15, Business §17, SEO/Settings, Version History §19, Delete §20, Activity Log §22.
4. **Public pages** — Home §5.1 → Work §5.2 → Project Detail §5.3 → Services §5.4/§5.5 → Pricing §5.6 → Process §5.7 → About §5.8 → Journal §5.9/§5.10 → Now §5.11 → Contact §5.12 → Start a Project §5.13 → Privacy/Terms §5.14.
5. **Polish** — Validation §29, ownership matrix §24, design QA §28.44.

### 33.8 Sync readiness checklist

- [ ] 2 forbidden features removed (§33.3)
- [ ] 6 legacy features re-scoped (§33.4)
- [ ] Missing targets created (§33.5)
- [ ] `features/index.md` corruption fixed (orphaned `Category Browsing`, `Hero Headline`; stray root `Project Gallery`)
- [ ] Every feature carries a spec (currently all 37 = `(No specification)`)
- [ ] Tasks generated (currently `0`)