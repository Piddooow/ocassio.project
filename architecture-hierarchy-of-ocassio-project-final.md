# Architecture Hierarchy of Ocassio.Project

# Build Directive

This specification is written for implementation by an AI coding agent and/or a professional development team.

The implementation must preserve the information architecture, ownership model, CRUD behavior, publishing rules, design tokens, theme mapping, validation requirements, and permission boundaries defined in this document.

When a detail is not explicitly defined:

```text
Do not invent new business logic.
Do not create a new page or CMS module by assumption.
Do not duplicate content ownership.
Prefer the simplest implementation that preserves the documented behavior.
Surface unresolved product decisions instead of silently changing the architecture.
```

The finished application must be:

```text
Functional
Responsive
Accessible
Maintainable
Performance-aware
Secure by design
Consistent with the Ocassio visual system
Manageable through the Admin CMS without routine code changes
```

---

> Single source of truth for the Ocassio.Project public website, Admin CMS, CRUD operations, publishing workflow, media management, and visual system.

---

# 0. AI Builder Authority & Conflict Rules

This document is the **single source of truth** for building Ocassio.Project.

If any instructions conflict, apply the following priority order:

```text
1. Product Architecture & Content Ownership
2. Ocassio Color System
3. Accessibility & Functional Correctness
4. Responsive / Performance Rules
5. Typography / Spacing / Component Styling
6. Decorative Effects
```

Non-negotiable:

```text
Ocassio color palette is LOCKED.

Do not introduce another brand palette.

Photography and video may contain any natural colors,
but UI chrome, surfaces, text, borders, CTA, statuses,
and system feedback must use the approved Ocassio tokens.

Do not add a new public page, admin module, content type,
or database relationship unless it exists in this document
or is explicitly requested later.

Do not duplicate a content source.

One content type = one admin owner = one source of truth.
```

When building from this specification:

```text
DO NOT:
- invent missing business rules,
- create decorative features without purpose,
- replace the information architecture with a template,
- turn the public website into a SaaS dashboard,
- turn the admin dashboard into a cinematic portfolio,
- expose draft/private content publicly,
- hardcode content that belongs in CMS,
- bypass role permissions,
- serve original RAW/TIFF assets to visitors.
```



---

# 1. Product Definition

Ocassio.Project is a **digital creative studio platform** for professional photographgraphy and film.

The platform has two primary surfaces:

```text
PUBLIC WEBSITE
→ for audiences, prospective clients, and showcasing creative work

ADMIN CMS
→ for owners and editors to manage all website content without touching the codebase
```

Primary objective:

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

Ocassio.Project is not merely an online gallery.

It must function as:

- Portfolio
- Visual storytelling platform
- Creative studio profile
- Service showcase
- Pricing reference
- Project inquiry system
- Journal
- Project update / coming soon
- Content management system

---

# 2. Core Architecture

```text
                         OCASSIO.PROJECT
                               │
               ┌───────────────┴───────────────┐
               │                               │
               ▼                               ▼
        PUBLIC WEBSITE                     ADMIN CMS
               │                               │
               │                               ▼
               │                        Authentication
               │                               │
               │                               ▼
               │                           Dashboard
               │                               │
               │              ┌────────────────┼────────────────┐
               │              │                │                │
               │              ▼                ▼                ▼
               │           Content           Media           Business
               │              │                │                │
               │              ▼                ▼                ▼
               │           Projects          Photos          Inquiries
               │           Services          Videos
               │           Pricing           Assets
               │           Journal
               │           Pages
               │
               ▼
        PUBLISHED CONTENT
               │
               ▼
    ┌──────────┼──────────────┐
    │          │              │
    ▼          ▼              ▼
 Database   Media Storage   Video Delivery
    │          │              │
    └──────────┴──────┬───────┘
                      │
                      ▼
                 CDN / CACHE
                      │
                      ▼
                PUBLIC WEBSITE
```

---

# 3. Architecture Rules

## 3.1 Single Source of Truth

Each data domain must have exactly one primary editing location.

Contoh:

```text
Project
→ Admin > Portfolio > Projects

Pricing
→ Admin > Services > Pricing

Instagram
→ Admin > Website > Global Settings

Homepage Hero
→ Admin > Website > Homepage
```

The same data must never be independently editable from two different modules.

---

## 3.2 Content Flexible, Design Controlled

Administrators may:

- Create
- Read
- Update
- Delete
- Reorder
- Hide / Show
- Preview
- Schedule
- Publish
- Unpublish
- Archive

Administrators must not modify:

- Font system
- Core color system
- Responsive rules
- Grid system
- Component code
- Custom CSS
- Authentication logic
- Database schema
- API logic

Tujuannya:

```text
ADMIN FREEDOM
+
DESIGN CONSISTENCY
```

---

# 4. Public Website Sitemap

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

# 5. Main Navigation

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

Pricing does not need to appear in the primary navigation.

Now / Coming Soon does not need to appear in the primary navigation.

Both remain accessible through contextual links, the homepage, service pages, and the footer.

---

# 6. Public Page Hierarchy

---

# 6.1 Home

URL:

```text
/
```

## Goal

Create a strong first impression and guide visitors toward:

```text
WORK
or
START A PROJECT
```

## Structure

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

## Content

### Hero

```text
Background Image / Video
Headline
Short Statement
View Work
Start a Project
```

### Selected Work

4–6 selected projects.

### Introduction

Short brand statement.

### Featured Project

One project with strong visual emphasis.

### Services

Preview the primary services.

### Showreel

1 selected film/video.

### Process

Provide a concise preview of the Ocassio workflow.

### Clients / Recognition

Selected clients, publications, award, or feature.

### Currently

Current project or coming soon.

### Journal

Maksimal 3 latest articles or featured.

### Final CTA

```text
Have a project in mind?

Start a Project →
```

## Admin Owner

```text
Admin
→ Website
→ Homepage
```

Administrators can:

- Edit copy
- Replace hero media
- Select featured projects
- Select featured article
- Select showreel
- Reorder supported sections
- Show / hide optional sections
- Preview
- Publish

---

# 6.2 Work

URL:

```text
/work
```

## Goal

Serve as the master portfolio for all published Ocassio work.

## Filters

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

## Project Card

```text
Cover
Project Name
Client / Type
Year
```

## Admin Owner

```text
Admin
→ Portfolio
→ Projects
```

The Work page is generated automatically from projects where:

```text
Status = Published
Visibility = Public
```

---

# 6.3 Project Detail

URL:

```text
/work/[slug]
```

## Goal

Present each project as a visual case study.

## Structure

```text
PROJECT HERO
↓
PROJECT INFORMATION
↓
INTRODUCTION
↓
PROJECT CONTENT
↓
FILM
optional
↓
BEHIND THE SCENES
optional
↓
CREDITS
↓
RELATED PROJECTS
↓
NEXT PROJECT
```

## Header Fields

```text
Project Name
Client
Year
Location
Category
Services
```

## Allowed Content Blocks

```text
Text
Full Width Image
Landscape Image
Portrait Image
Image Pair
Gallery
Quote
Video
Behind The Scenes
Spacer
```

Administrators can:

```text
Add
Edit
Remove
Reorder
```

Administrators cannot create arbitrary custom components.

## Credits

Possible fields:

```text
Photography
Director
DOP
Stylist
Makeup
Production
Agency
Client
```

Empty fields must not be rendered.

## Admin Owner

```text
Admin
→ Portfolio
→ Projects
```

---

# 6.4 Services

URL:

```text
/services
```

## Goal

Explain the services offered by Ocassio.Project.

## Initial Service Types

```text
Photography
Film & Motion
Commercial Campaign
Portrait
Product
Event
Creative Production
```

Each service contains:

```text
Cover
Name
Short Description
Starting Price
optional
Related Projects
```

## Admin Owner

```text
Admin
→ Services
→ Services
```

---

# 6.5 Service Detail

URL:

```text
/services/[slug]
```

## Structure

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

## Admin Fields

```text
Name
Slug
Hero
Short Description
Description
Who It Is For
Deliverables
Related Projects
Related Pricing
Related FAQ
CTA
SEO
Status
```

---

# 6.6 Pricing

URL:

```text
/pricing
```

## Goal

Set professional budget expectations without presenting the studio like a SaaS subscription product.

## Pricing Types

```text
FIXED
STARTING FROM
CUSTOM QUOTE
```

## Example

```text
PORTRAIT SESSION

Starting From
Rp X.XXX.XXX

Duration
90 Minutes

Includes
15 Final Photographs
Professional Retouching
High Resolution Delivery
```

Commercial example:

```text
COMMERCIAL PROJECT

Custom Quotation

Pricing depends on:

Scope
Crew
Location
Usage Rights
Production
Duration
Deliverables
```

## Admin Owner

```text
Admin
→ Services
→ Pricing
```

---

# 6.7 Process

URL:

```text
/process
```

## Goal

Explain clearly how clients work with Ocassio.Project.

## Default Flow

```text
01 Inquiry
↓
02 Discovery
↓
03 Creative Direction
↓
04 Proposal
↓
05 Pre-production
↓
06 Production
↓
07 Post-production
↓
08 Review
↓
09 Delivery
```

Each process step contains only:

```text
Number
Title
Short Explanation
```

## Admin Owner

```text
Admin
→ Services
→ Process
```

---

# 6.8 About

URL:

```text
/about
```

## Goal

Introduce the studio identity and the people behind Ocassio.Project.

## Structure

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

## Admin Ownership

```text
About
→ Studio > About

Team
→ Studio > Team

Clients
→ Studio > Clients

Recognition
→ Studio > Recognition
```

---

# 6.9 Journal

URL:

```text
/journal
```

## Goal

Show creative thinking, behind-the-scenes content, studio activity, and stories behind the work.

## Categories

```text
All
Project Stories
Behind The Scenes
Photography
Film
Studio Notes
```

## Article Card

```text
Cover
Category
Title
Publish Date
Reading Time
```

## Admin Owner

```text
Admin
→ Journal
→ Articles
```

---

# 6.10 Article Detail

URL:

```text
/journal/[slug]
```

## Structure

```text
TITLE
↓
CATEGORY + DATE
↓
COVER
↓
ARTICLE
↓
RELATED PROJECT
optional
↓
RELATED ARTICLES
↓
START A PROJECT
```

## Allowed Blocks

```text
Paragraph
Heading
Image
Gallery
Video
Quote
Project Reference
```

---

# 6.11 Now

URL:

```text
/now
```

## Goal

Show selected studio activity that is currently in progress.

## Public Status

```text
In Production
Coming Soon
```

## Card Fields

```text
Project Name
Project Type
Location
Public Status
Expected Release
Teaser
```

## Visibility

```text
Public
Private
```

Confidential projects must be:

```text
Private
```

## Admin Owner

```text
Admin
→ Current
→ Upcoming Projects
```

---

# 6.12 Contact

URL:

```text
/contact
```

## Goal

Use this page for general communication.

Project inquiries must not be submitted through this page.

## Structure

```text
New Projects
Email

General
Email

WhatsApp

Instagram
Vimeo
YouTube

Location

Availability
```

## Routing

```text
PROJECT REQUEST
→ Start a Project

GENERAL QUESTION
→ Contact
```

## Admin Owner

```text
Admin
→ Website
→ Global Settings
```

---

# 6.13 Start a Project

URL:

```text
/start-project
```

## Goal

Primary conversion page.

## Section 1 — Contact

```text
Full Name *
Company
Email *
WhatsApp
```

## Section 2 — Project

```text
Service *
Project Type *
Project Description *
```

## Section 3 — Production

```text
Desired Date
Location
Budget Range
Expected Deliverables
```

## Section 4 — References

```text
Reference URL
Attachment
```

Supported file:

```text
PDF
JPG
JPEG
PNG

Maximum 10 MB
```

## Submit

```text
Submit Project Brief
```

## Success State

```text
Thank you.

Your project brief has been received.

Ocassio.Project will review your request.
```

## Admin Destination

```text
Admin
→ Business
→ Project Inquiries
```

---

# 6.14 Privacy & Terms

URL:

```text
/privacy
/terms
```

## Admin Owner

```text
Admin
→ Website
→ Legal
```

Fields:

```text
Title
Body
Updated Date
Status
```

---

# 7. Public User Flows

## Portfolio Visitor

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

## Potential Client

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

## Existing Follower

```text
HOME
↓
NOW / JOURNAL
↓
ARTICLE / PROJECT
```

Rule:

```text
NO DEAD-END PAGE
```

Every page must provide a logical next action.

---

# 8. Admin CMS Architecture

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

---

# 9. Admin Dashboard

The dashboard must be action-oriented.

Avoid unnecessary charts.

## Overview

```text
CONTENT

Published Projects
Draft Projects
Scheduled Content
```

```text
BUSINESS

New Inquiries
Open Inquiries
```

```text
CURRENT

Coming Soon Projects
```

## Quick Actions

```text
+ New Project

+ New Article

+ Upcoming Project

View Inquiries
```

## Supporting Sections

```text
Recent Inquiries

Upcoming Publications

Recent Activity
```

---

# 10. Website Management

## 10.1 Homepage

Sections:

```text
Hero
Selected Work
Introduction
Featured Project
Services
Showreel
Process
Clients
Currently
Journal
CTA
```

Actions:

```text
Edit
Show / Hide
Reorder
Preview
Publish
```

The Hero and final CTA are mandatory and cannot be removed.

---

## 10.2 Navigation

Default:

```text
Work
Services
Process
About
Journal
Contact
```

Actions:

```text
Edit Label
Select Destination
Reorder
Show / Hide
```

Primary CTA dikelola terpisah:

```text
Start a Project
```

---

## 10.3 Global Settings

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

---

# 11. Portfolio Management

## Project List

Columns:

```text
Project
Client
Type
Status
Updated
```

Filters:

```text
Status
Type
Category
Year
```

Actions:

```text
Create
Edit
Preview
Duplicate
Publish
Unpublish
Archive
Delete
```

---

# 12. Project Editor

Tabs:

```text
01 Basic
02 Content
03 Media
04 Credits
05 Relations
06 SEO
07 Publishing
```

## Basic

```text
Project Title *
Slug *
Client
Project Type *
Category *
Year *
Location
Short Description *
```

## Media

```text
Cover *
Hero *
Project Media
```

## Content

Controlled block builder.

## Credits

Structured credits.

## Relations

```text
Services
Related Projects
Related Articles
```

## SEO

```text
SEO Title
SEO Description
Social Image
Index
```

## Publishing

```text
Visibility
Status
Publish Date
Featured
Homepage Feature
```

---

# 13. Publish Validation

A project cannot be published until all required data is complete.

Example:

```text
Cannot Publish

Please resolve:

Hero image is required.
Project category is required.
Short description is required.
At least one content block is required.
```

Rules:

```text
Slug must be unique.

Deleted relations must not create broken references.

Draft content must not appear on the public website.
```

---

# 14. Services Management

Each service:

```text
Name
Slug
Cover
Short Description
Description
Who It Is For
Deliverables
Related Projects
Related Pricing
FAQ
SEO
Status
```

Actions:

```text
Create
Edit
Preview
Publish
Unpublish
Archive
Delete
```

---

# 15. Pricing Management

Each pricing entry:

```text
Service
Package Name
Price Type
Price
Duration
Deliverables
Notes
Display Order
Status
```

Price type:

```text
Fixed
Starting From
Custom Quote
```

If:

```text
Custom Quote
```

then a numeric price value is not required.

---

# 16. Process Management

Default:

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

Actions:

```text
Create
Edit
Reorder
Hide
Delete
```

---

# 17. Journal Management

Article fields:

```text
Title *
Slug *
Category *
Cover *
Excerpt *
Content *
Related Project
Author
SEO
Publishing
```

Status:

```text
Draft
Scheduled
Published
Archived
```

---

# 18. Studio Management

## About

Singleton.

Only one About page.

## Team

```text
Name
Role
Photo
Short Bio
Display Order
Visibility
```

## Clients

```text
Client Name
Logo
Website
Featured
Display Order
```

## Recognition

```text
Title
Organization
Year
URL
Type
```

Type:

```text
Publication
Award
Feature
Exhibition
```

---

# 19. Current / Upcoming Project Management

Fields:

```text
Title
Project Type
Teaser
Location
Expected Release
Public Status
Related Project
Visibility
```

Public statuses:

```text
In Production
Coming Soon
```

Visibility:

```text
Public
Private
```

---

# 20. Media Library

## Goal

Central source of truth for all media assets.

## Filters

```text
All
Images
Videos

Project
Type
Year
Usage
```

## Asset Fields

```text
Preview
Filename
Title
Alt Text
Caption
Credit
Copyright
Project
Usage
Upload Date
```

## Actions

```text
Edit Metadata
Replace
Archive
Delete
```

If an asset is still referenced:

```text
Cannot Delete

Used in:
Homepage
Project X
Article Y
```

---

# 21. Image Pipeline

Administrators only need to upload the source image.

System menghasilkan optimized variants:

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

---

# 22. Focal Point

Each photographgraph may define a focal point.

Purpose:

- Preserve correct portrait cropping
- Prevent faces from being cropped unintentionally
- Keep mobile crops compositionally safe

---

# 23. Project Inquiry Management

Pipeline:

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

Alternative:

```text
DECLINED
```

## Inquiry Detail

```text
Client
Company
Email
WhatsApp
Service
Project Type
Brief
Date
Location
Budget
Deliverables
References
```

Internal:

```text
Status
Internal Notes
Assigned To
Activity
```

Ini merupakan lightweight lead manager.

This is not a full project management system.

---

# 24. Publishing Workflow

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

The public website reads only:

```text
Published Content
```

---

# 25. Version History

Required for:

```text
Homepage
Projects
Services
Pricing
Articles
About
```

Actions:

```text
View
Compare
Restore
```

---

# 26. Delete Flow

Avoid direct permanent deletion.

Use:

```text
Archive
↓
Trash
↓
Permanent Delete
```

Destructive actions require confirmation.

---

# 27. Roles & Permissions

## Owner

```text
Full Access
```

## Editor

```text
Website
Portfolio
Services
Journal
Studio
Current
Publishing
```

## Media Manager

```text
Media Library
```

## Sales

```text
Project Inquiries
```

Permissions must be enforced on the backend.

Hiding buttons in the frontend is not sufficient authorization.

---

# 28. Activity Log

Minimum fields:

```text
Who
Action
Object
Timestamp
```

Example:

```text
10:42
David published Human Motion.

10:20
Editor changed Portrait pricing.

09:52
Media Manager uploaded 12 images.

Yesterday
David restored Homepage Version 14.
```

---

# 29. CRUD UX Language

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

Hindari campuran istilah:

```text
Save
Apply
Commit
Push
Go Live
Submit
```

when the underlying action is the same.

---

# 30. Public Content Ownership Matrix

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

Rule:

```text
ONE PUBLIC CONTENT TYPE
=
ONE ADMIN OWNER
```

---

# 31. Integrated Visual Design System

This section defines the final visual language for both the public website and Admin CMS.

The visual direction is:

```text
PUBLIC PORTFOLIO
→ cinematic
→ immersive
→ image-first
→ restrained UI

PUBLIC INFORMATION PAGES
→ editorial
→ clean
→ premium
→ readable

ADMIN CMS
→ functional
→ clear
→ compact
→ predictable
```

The photographgraphy and film must provide most of the visual emotion.

The interface should not compete with the work.

---

# 31.1 Locked Color System

The following palette is authoritative.

No additional UI brand colors may be introduced.

## Brand

```text
BRAND
└── Primary             #171717
```

## Light Mode

```text
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
```

## Dark Mode

```text
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
```

## Primary CTA

### Light Mode

```text
Background              #171717
Text                    #FAFAFA
```

### Dark Mode

```text
Background              #F5F5F5
Text                    #171717
```

## Semantic

```text
Success                 #22C55E
Warning                 #F59E0B
Error                   #EF4444
Info                    #3B82F6
```

Semantic colors are only for functional system feedback.

Examples:

```text
Success
→ Publish completed
→ Upload completed
→ Inquiry status saved

Warning
→ Optional SEO information missing
→ Unsaved changes

Error
→ Required field missing
→ Upload failed
→ Permission denied
→ Publish validation failed

Info
→ Scheduled publish
→ Informational notice
```

Do not use semantic colors as decorative brand accents.

---

# 31.2 Color Usage Rules

## Light Surfaces

Use:

```text
Page Background
→ #FAFAFA

Alternate Section
→ #F5F5F5

Cards / Inputs
→ #FFFFFF

Primary Text
→ #171717

Body Text
→ #525252

Muted Metadata
→ #737373

Default Border
→ #E5E5E5

Strong / Focus Border
→ #D4D4D4
```

## Dark Surfaces

Use:

```text
Page Background
→ #171717

Deep Immersive Background
→ #0A0A0A

Cards / Elevated Surfaces
→ #202020

Hover Surface
→ #2A2A2A

Primary Text
→ #F5F5F5

Body Text
→ #D4D4D4

Muted Metadata
→ #A3A3A3

Default Border
→ #333333

Strong Border
→ #525252
```

## Atmospheric Effects

Do not introduce pastel UI gradients.

Atmosphere should come from:

```text
Photography
Video
Soft image blur
Subtle opacity
Light / dark tonal transitions
Very restrained monochrome overlays
```

Any overlay must derive from the existing black/white palette using opacity.

The media supplies color.

The interface stays neutral.

---

# 31.3 Typography System

Ocassio uses a two-family editorial system.

```text
DISPLAY
→ Light editorial serif

BODY / UI
→ Inter
```

## Display Font

Preferred:

```text
Waldenburg Light
Weight 300
```

Use the preferred display typeface only when a valid licensed font asset is available.

Build-safe fallback:

```text
EB Garamond
Weight 400 or nearest visually stable light weight
```

Do not download or bundle unlicensed font files.

## Body / Interface Font

```text
Inter
```

Weights:

```text
400
→ body text

500
→ navigation
→ controls
→ buttons
→ form labels

600
→ compact labels
→ small status emphasis
```

Avoid heavy 700/800 typography except when a future brand direction explicitly requires it.

---

# 31.4 Typography Scale

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

Rules:

```text
Display typography
→ never visually heavy
→ short copy
→ generous breathing room

Body typography
→ optimize readability
→ never use display serif for long paragraphs

Admin
→ primarily Inter
→ display serif is optional and limited to login/brand moments
```

---

# 31.5 Responsive Typography

```text
MOBILE < 640px

Display Mega
64px → clamp around 32–40px

Display XL
48px → 32px

Display LG
36px → 28px

Body
16px minimum for forms and main reading text
```

Use CSS `clamp()` where appropriate.

Do not reduce important body text below 16px merely to fit content.

---

# 31.6 Spacing System

Base unit:

```text
4px
```

Approved spacing tokens:

```text
4px
8px
12px
16px
20px
24px
32px
48px
64px
96px
128px
```

Recommended use:

```text
4–8px
→ inline micro spacing

12–16px
→ form/control internal spacing

20–24px
→ card/component spacing

32–48px
→ component groups

64–96px
→ normal page section spacing

96–128px
→ major editorial transitions on desktop
```

Do not use arbitrary values such as:

```text
37px
73px
111px
```

unless required for a specific media ratio or optical correction.

---

# 31.7 Grid & Container

## Standard Content Container

```text
Max Width
→ 1200px

Desktop Horizontal Padding
→ 32–48px

Tablet Horizontal Padding
→ 24–32px

Mobile Horizontal Padding
→ 20px
```

## Grid

Desktop editorial layout:

```text
12-column grid
```

Recommended gaps:

```text
Desktop
24px

Tablet
20px

Mobile
16px
```

## Full-Bleed Exception

Photography/video may intentionally escape the standard container.

Allowed for:

```text
Hero media
Project photographgraphy
Showreel
Film frames
Selected editorial compositions
```

Text content should remain constrained for readability.

---

# 31.8 Whitespace Philosophy

Whitespace is part of the brand.

Use it to:

```text
slow the reading rhythm,
create focus,
separate project moments,
make photographgraphy feel valuable,
avoid dashboard-like density on the public site.
```

Public pages:

```text
Generous whitespace.
```

Admin pages:

```text
Efficient whitespace.
```

Do not copy public-site spacing into Admin CMS.

---

# 31.9 Shape System

Ocassio uses restrained geometry.

## Radius Tokens

```text
None        0px
XS          4px
SM          6px
MD          8px
LG          12px
XL          16px
Pill        9999px
Full        9999px
```

## Usage

```text
Primary / secondary CTA
→ Pill

Status chips
→ Pill

Inputs
→ 8px

Admin panels
→ 8–12px

Editorial cards
→ 0–12px depending on media treatment

Large photographgraphy
→ usually 0px or subtle radius only
```

Rule:

```text
Do not round every rectangle.
```

The site must not look like a generic SaaS template.

---

# 31.10 Borders, Depth & Elevation

Ocassio uses:

```text
hairline borders
+
very subtle shadow
+
media contrast
```

not heavy elevation.

## Light Mode

```text
Default Border
→ #E5E5E5

Strong Border
→ #D4D4D4
```

## Dark Mode

```text
Default Border
→ #333333

Strong Border
→ #525252
```

Shadow should be minimal and derived from dark neutral opacity.

Example intent:

```text
Card resting
→ flat / border only

Card hover
→ subtle lift or slight tonal shift

Modal
→ stronger separation allowed
```

No multi-layer neon glow.

---

# 31.11 Primary Button

## Light

```text
Background
#171717

Text
#FAFAFA
```

## Dark

```text
Background
#F5F5F5

Text
#171717
```

## Geometry

```text
Height
40–44px

Horizontal Padding
20px

Radius
Pill

Font
Inter 15px / 500
```

## States

```text
Default
Hover
Pressed
Focus Visible
Disabled
Loading
```

Hover must use only approved palette values.

Examples:

```text
Light Primary Hover
→ tonal change within #171717 / neutral treatment

Dark Primary Hover
→ tonal change within #F5F5F5 / neutral treatment
```

Do not introduce a new accent color for hover.

---

# 31.12 Secondary & Tertiary Actions

## Secondary

```text
Transparent Background
1px Border
Theme-appropriate Text
Pill Radius
```

## Tertiary

```text
Text only
Optional arrow icon
No filled background
```

Hierarchy:

```text
1 primary action
+
optional secondary action
+
tertiary links
```

Avoid multiple competing filled buttons inside the same section.

---

# 31.13 Public Top Navigation

Desktop:

```text
Height
64px minimum

Left
Ocassio.Project identity

Center / Main
Work
Services
Process
About
Journal
Contact

Right
Start a Project
```

Behavior:

```text
Transparent or theme-integrated at top where media requires it.

On scroll:
→ may transition to a stable surface
→ preserve high text contrast
→ do not obscure media unnecessarily
```

Mobile:

```text
Brand
Menu trigger
```

Expanded menu must include:

```text
Work
Services
Process
About
Journal
Contact
Start a Project
```

No hidden essential navigation.

---

# 31.14 Homepage Visual Theme Map

Use this as the default implementation.

```text
NAVBAR
Adaptive to current section

01 HERO
DARK
Cinematic media-first

02 SELECTED WORK
DARK
Immersive

03 OCASSIO INTRODUCTION
LIGHT
Editorial reset

04 FEATURED PROJECT
DARK
Visual focus

05 SERVICES
LIGHT
Structured / readable

06 SHOWREEL
DARK
Film-first

07 HOW WE WORK
LIGHT
Editorial

08 CLIENTS / RECOGNITION
LIGHT
Quiet trust section

09 CURRENTLY / COMING SOON
DARK or media-led
Use dark by default

10 JOURNAL
LIGHT
Editorial

11 START A PROJECT
LIGHT
High clarity conversion

FOOTER
LIGHT by default
```

Theme changes must feel intentional.

Use spacing/media transitions rather than flashy theme-switch animations.

---

# 31.15 Page Theme Defaults

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

Dark mode on portfolio pages is not a user preference toggle requirement.

It is part of page art direction.

A future global theme toggle should not be added unless explicitly requested.

---

# 31.16 Project Card

Project cards should be image-led.

Structure:

```text
Media
↓
Project Name
Client / Type
Year
```

Rules:

```text
Image dominates.

Metadata remains quiet.

No card border unless necessary.

No unnecessary icon row.

No excessive hover overlay text.
```

Hover:

```text
Subtle media scale OR crop shift
+
View Project indicator
```

Do not stack multiple simultaneous effects.

---

# 31.17 Project Detail Media Components

Approved:

```text
Full Bleed Image
Contained Landscape
Contained Portrait
Image Pair
Editorial Grid
Gallery
Video
BTS Strip
Quote
Text Story Block
Credits
Related Project
```

Each media block must support:

```text
Asset
Alt Text
Caption optional
Credit optional
Focal Point
Aspect Ratio behavior
```

No layout block may require custom code from the Admin.

---

# 31.18 Service Card

Structure:

```text
Service Name
Short Description
Optional Supporting Image
Optional Starting Price
View Service
```

Light theme by default.

Avoid:

```text
SaaS-style feature icon grids
fake metric badges
decorative gradients
```

---

# 31.19 Journal Card

Structure:

```text
Cover
Category
Title
Publish Date
Reading Time
```

Design:

```text
Editorial
Image + typography
Minimal chrome
```

Use borders only where they aid grouping.

---

# 31.20 Pricing Presentation

Photography pricing should not look like software subscriptions.

Prefer:

```text
Editorial pricing rows
or
restrained package panels
```

Each entry shows only relevant information:

```text
Service
Package
Price Type
Price / Custom Quote
Duration
Deliverables
Notes
CTA
```

Avoid:

```text
Recommended neon badges
fake discount ribbons
three-column SaaS comparison clichés
```

---

# 31.21 Forms

Fields:

```text
Height
44–48px minimum

Radius
8px

Background
Theme Surface

Border
Theme Border

Text
Theme Primary

Placeholder
Theme Muted
```

States:

```text
Default
Hover
Focus
Filled
Error
Disabled
```

Focus must be visually obvious.

Errors must:

```text
identify the specific field,
explain what is wrong,
explain how to fix it.
```

Never show only:

```text
Invalid input
```

when a specific explanation is possible.

---

# 31.22 Start a Project Form UX

Form should remain one coherent workflow.

Recommended grouping:

```text
01 CONTACT
02 PROJECT
03 PRODUCTION
04 REFERENCES
05 REVIEW / SUBMIT
```

Desktop may display sections with strong grouping.

Mobile remains single-column.

Do not create a multi-step wizard unless real form length later proves it necessary.

Required fields use consistent `*` treatment.

Before submit:

```text
validate locally
+
validate on server
```

After successful submit:

```text
clear success confirmation
+
do not accidentally resubmit on refresh
```

---

# 31.23 Video & Showreel Component

Default behavior:

```text
Poster image first
Play on interaction
Controls accessible
No surprise autoplay with sound
```

Muted visual background loops are allowed only for cinematic hero treatment.

If background autoplay is used:

```text
muted
playsinline
loop
short
optimized
non-blocking
```

Provide a static fallback poster.

---

# 31.24 Cursor & Hover Contrast

Any custom cursor/highlight must adapt to local contrast.

```text
LIGHT SECTION
→ dark cursor/highlight

DARK SECTION
→ light cursor/highlight
```

Rules:

```text
Never merge into text or background.

Never hide native usability cues.

Native cursor is the fallback.

On touch devices:
→ custom cursor disabled.
```

Custom cursor is decorative enhancement, not navigation logic.

---

# 31.25 Motion Principles

Motion must be:

```text
slow enough to feel premium,
fast enough to remain responsive,
purposeful,
subtle,
interruptible.
```

Recommended categories:

```text
Page / section reveal
Media hover
Navigation transition
Theme transition
Modal / drawer
Toast
Loading state
```

Avoid:

```text
continuous decorative motion everywhere,
scroll hijacking,
long forced intro sequences,
cursor trails,
heavy parallax on every section,
animation that delays content access.
```

Respect:

```text
prefers-reduced-motion
```

---

# 31.26 Responsive Breakpoints

Reference behavior:

```text
Mobile
< 640px

Tablet
640–1023px

Desktop
1024–1279px

Wide
>= 1280px
```

These are layout guidance, not rigid device detection.

---

# 31.27 Responsive Collapse Rules

## Navigation

```text
Desktop horizontal nav
→ mobile menu below tablet threshold
```

## Public Grids

```text
3 columns
→ 2 columns
→ 1 column
```

depending on content.

## Project Image Pair

```text
Desktop
→ two-column where composition permits

Mobile
→ stack vertically
```

## Admin

```text
Desktop sidebar
→ collapsible sidebar / drawer on smaller screens
```

Never hide required administrative actions solely because the viewport is smaller.

---

# 31.28 Touch & Accessibility Targets

Interactive controls should target approximately:

```text
44px minimum effective tap area
```

Small visual icons may exist inside a larger clickable region.

All:

```text
buttons
links
menu triggers
pagination
media controls
admin row actions
```

must remain operable by keyboard where relevant.

---

# 31.29 Admin Visual System

The Admin CMS is light-first.

Base:

```text
Background
#FAFAFA

Surface
#FFFFFF

Text Primary
#171717

Text Secondary
#525252

Border
#E5E5E5
```

Admin design prioritizes:

```text
information clarity,
table readability,
form consistency,
predictable actions,
compact density,
visible system status.
```

The Admin CMS must not use:

```text
cinematic dark backgrounds by default,
oversized display headlines,
decorative hero sections,
portfolio-style transitions,
large ornamental photographgraphy.
```

---

# 31.30 Admin Layout

Desktop:

```text
┌──────────────┬────────────────────────────────┐
│ Sidebar      │ Header                         │
│              ├────────────────────────────────┤
│ Dashboard    │                                │
│ Website      │ Main Workspace                 │
│ Portfolio    │                                │
│ Services     │                                │
│ Journal      │                                │
│ Studio       │                                │
│ Current      │                                │
│ Media        │                                │
│ Business     │                                │
│ Publishing   │                                │
│ SEO          │                                │
│ Users        │                                │
│ Activity     │                                │
└──────────────┴────────────────────────────────┘
```

Sidebar:

```text
persistent on desktop,
collapsible if needed,
clear active state,
icons optional,
text labels mandatory.
```

---

# 31.31 Admin Page Pattern

Every management page follows:

```text
PAGE TITLE
Short helper text optional

PRIMARY ACTION
+ New [Content Type]

FILTERS / SEARCH

CONTENT LIST / TABLE

PAGINATION

EMPTY STATE when no data
```

Example:

```text
Projects

Manage portfolio projects.

[ + New Project ]

Search...
Status
Category
Year

Project | Client | Type | Status | Updated | Actions
```

Do not hide the main CRUD action inside a menu.

---

# 31.32 Admin Table Rules

Use tables for:

```text
Projects
Articles
Clients
Inquiries
Users
Activity
Scheduled Content
```

Table guidelines:

```text
Clear column titles
Row hover
Status visible
Primary object name clickable
Actions predictable
Bulk actions only where justified
Horizontal scrolling allowed on small screens if necessary
```

Do not turn every table row into a large visual card.

---

# 31.33 Admin Editor Pattern

Each editor uses:

```text
Sticky / visible action area:
Save Draft
Preview
Publish / Update

Main editor:
structured fields

Secondary metadata:
SEO
Publishing
Relations
```

If tabs are used, do not hide validation errors.

A publish attempt must summarize errors across all tabs.

---

# 31.34 Status Chips

Status chips use semantic meaning.

Examples:

```text
Published
Draft
Scheduled
Archived
Private
New Inquiry
Proposal Sent
Completed
Declined
```

Use neutral chips for lifecycle states unless semantic urgency exists.

Reserve:

```text
Green
→ success / completed

Amber
→ warning / pending attention

Red
→ error / destructive / failed

Blue
→ informational state
```

Do not color every status brightly.

---

# 31.35 Admin Empty States

Empty states explain:

```text
what this area is,
why it is empty,
what the administrator should do next.
```

Example:

```text
No projects yet.

Create the first project to begin populating the Work page.

[ + New Project ]
```

Avoid decorative filler copy.

---

# 31.36 Admin Confirmation Dialogs

Required for:

```text
Delete
Permanent Delete
Unpublish
Restore Version
Change User Role
Remove Used Media
Discard Unsaved Changes
```

Dialog must state:

```text
Object affected
Consequence
Whether action is reversible
```

Destructive primary action uses Error semantic color.

---

# 31.37 Toasts & System Feedback

Use concise feedback.

Examples:

```text
Project saved as draft.

Project published.

Upload completed.

Could not publish. Fix 3 validation issues.
```

Do not use vague messages:

```text
Success!
Something went wrong.
```

when a more specific message is available.

---

# 31.38 Media Picker UX

When selecting media from CMS:

```text
Search
Filter
Preview
Select
Upload New
```

Administrators must be able to identify:

```text
filename
project relationship
type
dimensions where useful
usage state
```

Selecting an asset does not duplicate the file.

It creates a reference to the existing media asset.

---

# 31.39 Media Ratios

Do not force all photographgraphy into one ratio.

Supported editorial ratios may include:

```text
Original
Landscape
Portrait
Square
Cinematic
```

The original image remains the source.

Frontend crops/frames through layout rules and focal point.

Avoid destructive crop at upload unless explicitly chosen.

---

# 31.40 Performance-Aware Design

Design choices must support fast loading.

Rules:

```text
Hero image/video
→ explicitly prioritized

Below-fold images
→ lazy load

Responsive images
→ size-appropriate source

Video
→ poster-first

Gallery
→ progressive load

RAW / TIFF
→ never public delivery

Animations
→ transform/opacity where possible
```

Do not sacrifice image quality blindly.

Optimize dimensions, encoding, and delivery instead.

---

# 31.41 Design Do's

```text
DO:
- let photographgraphy provide visual color,
- use neutral UI chrome,
- use large but restrained editorial typography,
- preserve generous whitespace on public pages,
- keep CTA hierarchy obvious,
- use dark environments for immersive work,
- use light environments for reading and business information,
- use hairline borders,
- keep motion subtle,
- make Admin straightforward and compact,
- reuse the same component tokens everywhere.
```

---

# 31.42 Design Don'ts

```text
DO NOT:
- add pastel/neon UI colors,
- add gradients as button fills,
- create glassmorphism-heavy sections,
- use rounded cards everywhere,
- use giant text only to appear modern,
- add marquees without information value,
- add decorative floating orbs,
- create excessive bento grids,
- animate every component,
- turn pricing into SaaS tiers by default,
- place text over busy photographgraphy without sufficient contrast,
- use different typography rules on every page,
- add new design tokens ad hoc.
```

---

# 31.43 Component Token Discipline

Implementation should use reusable tokens.

Never hardcode repeated values across components.

Conceptual token structure:

```text
colors.*
typography.*
spacing.*
radius.*
border.*
container.*
breakpoint.*
motion.*
```

Components should consume tokens.

Example:

```text
PrimaryButton
→ theme CTA background
→ theme CTA text
→ button typography
→ pill radius
→ standard button height
```

---

# 31.44 Design QA Checklist

Before considering a page complete:

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

---

# 32. Theme & Experience Strategy

The final Ocassio experience intentionally uses contextual themes rather than one visual canvas everywhere.

```text
DARK
→ work
→ photographgraphy
→ video
→ showreel
→ immersive project storytelling

LIGHT
→ about
→ services
→ pricing
→ process
→ journal reading
→ contact
→ inquiry
→ admin management
```

Theme is an editorial decision.

It must not create confusion in navigation or interaction behavior.

The same:

```text
navigation logic
button hierarchy
spacing system
type system
interaction rules
```

must remain consistent across both themes.

---

# 33. Design-System Relationship to CMS

The CMS manages **content**.

The frontend design system manages **presentation**.

Example:

```text
ADMIN INPUT

Project Title
Hero Image
Description
Gallery
Credits
Related Project

        ↓

DESIGN SYSTEM

Project Hero
Editorial Text Block
Full Bleed Media
Image Pair
Credits Layout
Related Work Layout

        ↓

PUBLIC PAGE
```

Administrators do not define arbitrary CSS.

Administrators compose pages using approved content blocks only.

This separation is mandatory.

---

# 34. Component Ownership

Public components:

```text
Navbar
Footer
Primary CTA
Secondary CTA
Project Card
Project Hero
Project Content Blocks
Service Card
Pricing Entry
Process Step
Journal Card
Article Blocks
Coming Soon Card
Contact Information
Inquiry Form
Media Player
```

Admin components:

```text
Sidebar
Header
Data Table
Search
Filter
Pagination
Editor Form
Block Builder
Media Picker
Upload
Status Chip
Confirmation Dialog
Toast
Version History
Role Selector
Activity Log
```

Shared behavior:

```text
validation
loading
error
empty
disabled
focus
permission-aware rendering
```

---

# 35. Responsive Principles

The public website must be designed intentionally for:

```text
Mobile
Tablet
Desktop
Wide Desktop
```

Priority:

```text
Mobile
→ readable
→ fast
→ simple navigation
→ correct media crop
→ tap-friendly

Desktop
→ immersive
→ editorial composition
→ larger photographgraphy
→ richer spacing
```

Mobile is not a scaled-down desktop.

Composition may change.

Information hierarchy may not.

---

# 36. Media Performance Rules

Media-heavy design is allowed only when delivery is optimized.

```text
Hero media
→ high priority

First visible project media
→ normal/high based on LCP role

Below fold
→ lazy

Video
→ poster-first

Background video
→ muted + optimized + optional

Gallery
→ progressive

Original RAW / TIFF
→ storage only
→ never directly served
```

Admin uploads must automatically generate or trigger delivery-ready media variants.

# 37. Validation & Error Prevention

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

Goal bukan menjanjikan zero bug.

Goal:

```text
MINIMIZE
AMBIGUITY
HUMAN ERROR
BROKEN CONTENT
REGRESSION
```

---

# 38. Admin CRUD Flow

All modules must follow the same interaction pattern:

```text
MODULE LIST
↓
CREATE / SELECT
↓
EDITOR
↓
SAVE DRAFT
↓
VALIDATE
↓
PREVIEW
↓
PUBLISH
```

Administrators should not need to learn a different workflow for each module.

---

# 39. Final System Loop

```text
                        ADMIN
                          │
                          ▼
                     DASHBOARD
                          │
        ┌─────────────────┼──────────────────┐
        │                 │                  │
        ▼                 ▼                  ▼
     CONTENT            MEDIA             BUSINESS
        │                 │                  │
        ▼                 ▼                  ▼
     Project            Asset             Inquiry
     Service            Library           Pipeline
     Article
     Pages
        │
        ▼
      DRAFT
        │
        ▼
    VALIDATION
        │
        ▼
     PREVIEW
        │
        ▼
     PUBLISH
        │
        ▼
      WEBSITE
        │
        ▼
      VISITOR
        │
        ▼
   START A PROJECT
        │
        ▼
      INQUIRY
        │
        └──────────────────────────────► ADMIN
```

---

# 40. Architecture Boundary

Administrators can manage the following without code changes:

```text
Projects
Photos
Videos
Homepage
Featured Work
Services
Pricing
Process
FAQ
Articles
About
Team
Clients
Recognition
Coming Soon
Navigation
Contact Information
Social Links
Legal Content
SEO Content
Project Inquiries
```

Developer involvement is still required for:

```text
New Component Type
New Complex Interaction
New External Integration
New Database Structure
Authentication Changes
New Business Workflow
Major Layout Redesign
Payment System
Booking System
3D / WebGL Experiences
```

---

# 41. Pages Not Yet Included

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

Rule:

```text
DO NOT ADD A PAGE
WITHOUT A CLEAR BUSINESS PURPOSE
```

---

# 42. Final Direction

Public website direction:

```text
Simple
Cinematic
Editorial
Memorable
Premium
Image-first
Easy to understand
Easy to navigate
```

Admin CMS direction:

```text
Clear
Functional
Structured
Predictable
Safe
No-code content management
```

Final architecture philosophy:

```text
SIMPLE IN FRONT
POWERFUL IN BACK
CONTROLLED BY DESIGN
MANAGED WITHOUT CODE
```

Ocassio.Project should guide visitors through:

```text
Discovery
↓
Admiration
↓
Understanding
↓
Trust
↓
Collaboration
```

The Admin CMS should guide administrators through:

```text
Create
↓
Manage
↓
Preview
↓
Publish
↓
Monitor
```

without ambiguity.
