# Security — OWASP Top 10

The application must follow OWASP Top 10 security principles.

## 1. Broken Access Control

* Every protected endpoint must verify authentication and authorization.
* User ID must come from the authenticated auth context, never from request body/query parameters.
* Users can modify/delete only their own listings and profile.
* Chat participants can access only their own conversations.
* Never trust IDs such as `seller_id`, `buyer_id` or `sender_id` from the frontend.
* Backend authorization is mandatory; frontend route protection is not security.

## 2. Cryptographic Failures

* Passwords must be hashed using Argon2 or bcrypt.
* Never store or log plaintext passwords.
* Use HTTPS in production.
* JWT/session secrets must come from environment variables.
* Never commit secrets to the repository.

## 3. Injection

* Use SQLAlchemy/parameterized queries.
* Never build SQL queries using string concatenation with user input.
* Validate and sanitize user-controlled input.
* Do not render user input as raw HTML.

## 4. Insecure Design

* Follow least-privilege principles.
* Validate ownership before every modification/deletion.
* Do not trust frontend-provided security-sensitive fields.
* Keep service/database boundaries: services must not access another service's DB directly.

## 5. Security Misconfiguration

* Do not use debug mode in production.
* Do not expose stack traces or internal errors to users.
* Configure CORS explicitly.
* Do not use wildcard CORS with credentials.
* Disable unnecessary endpoints and services.
* Secrets and configuration must be provided through environment variables.

## 6. Vulnerable Components

* Keep dependencies reasonably up to date.
* Pin dependency versions where practical.
* Do not add unnecessary dependencies.
* Check dependencies for known vulnerabilities before production deployment.

## 7. Authentication Failures

* Authentication must be handled by the Auth Service.
* JWT/session credentials must be validated on every protected request.
* User identity must be based on a stable UUID (`users.id`).
* JWT rotation must not change the user's UUID.
* Implement reasonable login rate limiting.
* Never reveal whether a username/email exists through overly specific authentication errors.

## 8. Data Integrity Failures

* Validate all incoming data using Pydantic/backend schemas.
* Never trust client-side validation.
* Uploaded files must be validated by actual file type, not only filename extension.
* Do not deserialize untrusted data using unsafe mechanisms.
* Database migrations must be version controlled.

## 9. Logging & Monitoring Failures

* Log security-relevant events such as failed authentication and authorization failures.
* Never log passwords, JWTs, cookies or other secrets.
* Do not expose sensitive internal information in API responses.
* Use structured logging where practical.

## 10. SSRF

* Do not allow users to make arbitrary server-side HTTP requests.
* External URLs must be validated and restricted if the application introduces URL fetching.
* Do not fetch user-provided URLs from backend services unless explicitly required.

## General Rules

* Validate input on the backend.
* Apply authorization on every protected operation.
* Never trust the frontend.
* Never expose secrets.
* Never store plaintext passwords.
* Never log credentials or tokens.
* Return generic errors to users and detailed errors only to internal logs.
* Security must not depend on frontend behavior.

## Definition of Done

A feature is not complete if it introduces:

* an authorization bypass;
* trusted user IDs from the frontend;
* plaintext passwords;
* SQL injection;
* unrestricted file uploads;
* exposed secrets;
* sensitive information in logs;
* unnecessary public endpoints.

All existing tests must continue to pass after security-related changes.
