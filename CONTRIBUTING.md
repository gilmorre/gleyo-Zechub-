# Contributing to Gleyo

Thank you for your interest in contributing to Gleyo.

Gleyo is an open-source community growth and participation platform being developed for the Zcash ecosystem. Contributions are welcome across software development, integrations, documentation, testing, security, and other areas that improve the project.

## Getting Started

Before contributing, please read:

* [`README.md`](./README.md) for an overview of Gleyo and basic development information.
* [`SETUP.md`](./SETUP.md) for the complete development and infrastructure setup guide.

The setup guide contains the current requirements and instructions for running Gleyo locally, including Python, the virtual environment, Supabase, environment variables, and optional Zcash infrastructure.

For local development, you generally do not need to run a Zebra node or Nozy Wallet. These are only required when working on functionality that depends on real Zcash transactions or the production wallet infrastructure.

## Development Environment

Gleyo's backend is primarily written in Python and uses Flask and related Python libraries. The project also integrates with external services and Zcash infrastructure.

Before submitting a contribution:

1. Set up the project using [`SETUP.md`](./SETUP.md).
2. Create your own `.env` from `.env.example`.
3. Never commit secrets, API keys, wallet credentials, private keys, passwords, or other sensitive information.
4. Make sure the application starts successfully in your local environment.
5. Test the functionality affected by your changes.

## Branches and Changes

Create a separate branch for your work rather than making changes directly on `main`.

Use descriptive branch names where possible. Examples:

```text
feature/quest-validation
fix/withdrawal-status
fix/discord-integration
docs/contributing-guide
```

Keep each change focused on a specific purpose. Avoid combining unrelated features, refactors, and fixes in the same pull request unless they are directly connected.

## Code Style

Contributions should follow the existing style of the Gleyo codebase.

For Python:

* Follow consistent PEP 8-style formatting.
* Use clear and descriptive names.
* Keep functions and modules focused on a specific responsibility.
* Avoid unnecessary duplication.
* Add comments when they clarify non-obvious behavior, rather than commenting every line.
* Handle errors explicitly where failure could affect users, payments, authentication, or infrastructure.
* Do not introduce unnecessary dependencies.

For frontend code:

* Follow the existing HTML, CSS, and JavaScript structure.
* Keep user-facing behavior consistent with the existing application.
* Avoid unnecessary changes to unrelated UI or styling.

For Zcash-related functionality:

* Pay particular attention to security, transaction handling, address handling, wallet interactions, and error states.
* Do not expose private keys, wallet seeds, API credentials, or other sensitive information in code, logs, screenshots, issues, or pull requests.

## Zcash Development Standards

Gleyo aims to follow the high standards expected of software developed within the Zcash ecosystem.

The [`librustzcash` CONTRIBUTING.md](https://github.com/zcash/librustzcash/blob/main/CONTRIBUTING.md) is used as a primary reference for contribution and style guidance, particularly for development practices, commit conventions, pull requests, and code quality.

Contributors working on Zcash-related code should also follow the contribution guidelines of any upstream Zcash project they modify or depend on.

When contributing to an existing Zcash project, follow that project's own contribution requirements rather than assuming Gleyo's guidelines replace them.

## Commits

Write clear commit messages that describe what the commit changes.

Good examples:

```text
Add GitHub quest validation
Fix pending withdrawal status
Improve community onboarding flow
Update Zcash integration documentation
```

Avoid vague messages such as:

```text
update
fix stuff
changes
final
```

Keep commits reasonably focused so that changes are easier to review and understand.

## Pull Requests

Before opening a pull request:

* Make sure your changes are limited to the intended functionality.
* Test the affected functionality locally.
* Check for accidental secrets or sensitive files.
* Update documentation when behavior or setup requirements change.
* Explain what the pull request changes and why.
* Mention any known limitations or follow-up work.

A pull request should make it easy for a maintainer to understand:

1. What changed?
2. Why was it changed?
3. How was it tested?
4. Are there any known issues or limitations?

## Testing

Test your changes before submitting a pull request.

At minimum:

* Confirm the application starts successfully.
* Test the functionality you changed.
* Test relevant error cases.
* Check that existing functionality affected by your change still works.

For changes involving payments, rewards, authentication, wallet operations, or external integrations, additional testing should be performed where practical because failures in these areas can affect users or funds.

If a change requires a particular external service or infrastructure component to test, document that requirement in the pull request.

## Security

Security issues should not be disclosed publicly before they can be responsibly addressed.

Do not include any of the following in commits, issues, pull requests, screenshots, or logs:

* Private keys
* Wallet seeds
* API keys
* Authentication tokens
* Passwords
* Database credentials
* Production environment variables
* Other confidential credentials

If you discover a security vulnerability affecting Gleyo, report it privately to the maintainers rather than immediately publishing detailed exploitation instructions.

## Documentation

Documentation is part of the contribution.

If your change modifies:

* Installation requirements
* Environment variables
* API behavior
* Zcash functionality
* Integrations
* Deployment procedures
* User workflows

update the relevant documentation as part of the same contribution.

If the existing documentation is unclear or incomplete, improving it is also a valuable contribution.

## Issues and Bug Reports

When reporting a bug, provide enough information for someone else to reproduce it.

Where possible, include:

* What you were trying to do
* What you expected to happen
* What actually happened
* Steps to reproduce the issue
* Relevant error messages
* Environment information
* Screenshots or logs when useful

Never include private keys, wallet seeds, passwords, API keys, or other secrets in a bug report.

## Contributions Beyond Code

Contributions do not have to be code.

Useful contributions can include:

* Documentation
* Testing
* Bug reports
* Security reviews
* UX improvements
* Accessibility improvements
* Zcash ecosystem integrations
* Developer tooling
* Community workflows
* Suggestions
