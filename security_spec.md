# Security Architecture Specification

## 1. Data Invariants
- **Master Admin Identity**: Only requests matching `request.auth.token.email == "cessplantelchihuahua@gmail.com"` have broad CRUD rights across the entire system.
- **Relational Integrity**: 
  - A `Payment` cannot be read by a student unless it belongs to that student. Currently, this relies on client-side filtering which is completely insecure.
  - A `Student` can only be read by themselves or the admin. 
  - A `Teacher` can only be read by themselves or the admin.
  - `Grades` can only be read by the assigned student, the teacher who assigned them, or the admin.
- **Structural Integrity**: Any document write must adhere strictly to the exact fields and types defined in the blueprint. Shadow field injections (`isAdmin`, `isPaid`) are implicitly denied by strict key comparisons.

## 2. The "Dirty Dozen" Threat Payloads
1. **Identity Spoofing (Write)**: A student attempts to create a payment document where `status: "Paid"`.
2. **PII Masking**: An authenticated student attempts a blanket list query on `/students/` without filtering, extracting all other students' emails and phone numbers.
3. **Ghost Keys Injection**: Admin or User attempts to save `{ ...validData, isVerified: true }`. Should be blocked.
4. **Denial of Wallet**: A student puts a 2MB string into `payment.description`.
5. **Unauthorized Grade Modification**: A student tries to do a partial update on their own grade from 60 to 100.
6. **Teacher Group Hijacking**: A teacher attempts to assign themselves to a group they shouldn't control.
7. **Cross-Tenant Attack**: A random Google user authenticates and tries to list any document.
8. **Incomplete Schedule**: A student attempts to overwrite `paymentPlanStatus` to mark schedule `[true, true]`.
9. **Creation Timestamp Forgery**: Changing `createdAt` to a paste date to bypass late fees.
10. **The "Update Gap"**: Passing valid keys but wrong types (e.g., `amount: "zero"`).
11. **Client Delegation Scraping**: The rule `allow list` fails to verify `resource.data.email == request.auth.token.email`, allowing mass scraping.
12. **Bypass Relational Integrity**: Trying to assign a grade to a non-existent `studentId`.

## 3. Findings & Mitigation Strategy
Our analysis reveals a **Critical System Vulnerability** in the current `firestore.rules`:

**Vulnerability 1: Blanket Reads & PII Leakage**
Currently, `allow read: if isAuthenticated();` allows ANY user with a Google account to dump the entire school's database (payments, grades, student emails, phones). 

**Vulnerability 2: Admin Bypass**
The rules rely on `userId`, which in the code is set to the *creator's* UID (always the Admin). This means students and teachers actually have *zero* write access natively (which is accidentally secure), but the rules logic is disjointed from the physical app context.

**Resolution Plan:**
Because the app does not tag `payments` or `grades` with the student's or teacher's `email`, we face the O(N) cost explosion block (we cannot use `get()` in list queries). 
Therefore, before deploying hardened rules:
1. We will inject an email property into reads (via the client) or only allow list queries if the client specifies their email. Wait, the client already passes `studentId`, not `email`.
2. We must enforce queries using `request.auth.token.email`.

We will rewrite `firestore.rules` using the 8 Pillars of Security.
