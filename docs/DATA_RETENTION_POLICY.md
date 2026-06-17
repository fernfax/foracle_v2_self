# Data Retention Policy

**Last updated: 11 June 2026**
**Owner: Data Protection Officer (DPO)**
**Review cycle: at least annually**

> This is an **internal operational policy** that sets out how long Foracle
> retains personal and financial data, and how data is deleted or anonymised. It
> implements the **Retention Limitation Obligation (Section 25)** of the
> **Personal Data Protection Act 2012** (**"PDPA"**) and supports the
> commitments in our [Privacy Policy](./PRIVACY_POLICY.md). It is not a
> contract with users, but it governs our practices.

---

## 1. Purpose and principle

The PDPA requires us to **cease retaining** personal data — by deleting it or
removing the means by which it can be associated with an individual
(anonymisation) — as soon as it is reasonable to assume that retention is no
longer necessary for any legal or business purpose.

Our guiding principle: **collect only what we need, keep it only as long as we
need it, then delete or anonymise it.**

---

## 2. Scope

This policy covers all personal and financial data processed by Foracle,
including:

- account and identity data (name, email, profile image);
- financial data entered by users (income, CPF, expenses, assets, liabilities,
  insurance policies, holdings, goals);
- household / family member data;
- AI assistant conversations and uploaded documents (and derived embeddings);
- technical, log, and security data; and
- copies held in backups and with sub-processors.

---

## 3. Retention schedule

> Periods below are defaults. Where a legal obligation requires a longer period,
> the legal period prevails. Where data is no longer needed sooner, we delete or
> anonymise it sooner.

| Data category                                                                                | Retention period                                                                    | Action on expiry              |
| -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------- |
| **Active account data** (identity + financial data)                                          | For the life of the account                                                         | —                             |
| **Financial & household data after account deletion**                                        | Deleted/anonymised within **30 days** of account deletion                           | Delete from primary store     |
| **Authentication / account records (Clerk)**                                                 | Deleted on account deletion, per provider's process                                 | Delete                        |
| **AI assistant conversations**                                                               | Up to **90 days** from creation, or until account deletion (whichever is earlier)   | Delete or anonymise           |
| **Uploaded documents & derived embeddings**                                                  | Until the user deletes them or deletes their account                                | Delete                        |
| **Application & security logs** (incl. IP, access logs)                                      | Up to **12 months**                                                                 | Delete or anonymise           |
| **Backups**                                                                                  | Rolling backups retained up to **35 days**, then overwritten/purged                 | Purge on cycle                |
| **Records needed for legal/tax/accounting** (e.g. transaction or compliance records, if any) | As required by law — typically up to **5 years** (or longer where the law requires) | Delete after statutory period |
| **Records relating to a dispute, claim, or investigation**                                   | Until the matter is fully resolved + any applicable limitation period               | Then delete                   |
| **Data breach records**                                                                      | Retained as needed for compliance and PDPC reporting                                | Per legal requirement         |

---

## 4. Deletion and anonymisation

- **Deletion** means permanent removal from primary systems, with copies in
  backups purged on the backup cycle (Section 3).
- **Anonymisation** means irreversibly removing or transforming identifiers so
  the data can no longer be associated with an individual. Anonymised/aggregated
  data (e.g. for analytics or product improvement) is not personal data and may
  be retained.
- When deleting, we also instruct relevant sub-processors (e.g. authentication,
  AI, hosting providers) to delete the corresponding data in accordance with
  their contracts and capabilities.

---

## 5. Account deletion process

1. A user may delete their account from within the Service or by contacting the
   DPO at `[DPO EMAIL]`.
2. On deletion, the account is deactivated immediately and primary-store data is
   deleted or anonymised within the period in Section 3 (default 30 days).
3. We may retain a minimal subset of data only where required for a legal,
   accounting, dispute-resolution, or fraud-prevention purpose, and only for as
   long as that purpose requires. Such data is access-restricted.
4. Backups containing the deleted data are purged on the normal backup cycle.

---

## 6. Data breach handling

If a data breach occurs, we follow our incident-response process and the PDPA's
**Data Breach Notification Obligation**:

- assess whether the breach is **notifiable** — i.e. likely to result in
  significant harm to affected individuals, or affecting **500 or more
  individuals**;
- if notifiable, notify the **PDPC within 3 calendar days** of determining it is
  notifiable, and notify **affected individuals as soon as practicable** where
  the breach is likely to cause them significant harm;
- contain and remediate the breach; and
- record the breach and the response.

---

## 7. Roles and responsibilities

- **DPO** — owns this policy, ensures retention periods are applied, handles
  access/deletion requests, and oversees breach notification.
- **Engineering** — implements and maintains deletion/anonymisation routines,
  backup expiry, and log rotation consistent with this policy.
- **All staff** — must not retain personal data outside approved systems or
  beyond the periods in this policy.

---

## 8. Review

This policy is reviewed at least annually, and whenever there is a material
change to our data processing, sub-processors, or the law. Changes are approved
by the DPO.

---

> **Disclaimer about this document.** This template reflects general PDPA
> retention principles as at the "Last updated" date and is **not legal advice.**
> The specific periods above (e.g. 30 days, 90 days, 12 months, 5 years) are
> reasonable defaults that you must confirm against your actual technical
> capabilities and any sector-specific legal/tax record-keeping obligations that
> apply to your business, ideally with a Singapore-qualified lawyer.
