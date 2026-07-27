# OpenFriend review rules

## User story and scope

- Flag product behavior that does not advance an accepted user story or lacks
  observable acceptance criteria.
- Flag speculative providers, platforms, abstractions, and infrastructure that
  violate YAGNI.
- Flag code, tests, and durable documentation that disagree about current
  behavior.

## Behavior and evidence

- Require a focused test for new or changed behavior. Configuration, generated
  files, and documentation do not need artificial unit tests.
- Flag false completion claims, especially external actions that are not
  confirmed by their source system.
- Flag changes that could block or slow the live companion when deeper work
  belongs in the background operator.

## Security and account boundaries

- Treat the repository and all CI output as public. Flag secrets, populated
  credentials, private conversations, real personal data, sensitive logs, and
  unsafe examples.
- Flag browser-bundled or durable Watch secrets and long-lived provider
  credentials.
- Flag any use of Ready Homes or another company account, resource, identifier,
  or environment for OpenFriend.
- Flag consequential external writes that can occur without explicit approval
  and source-system confirmation.

## Reliability and teardown

- Flag retries or reconnection paths that can duplicate external work or report
  an uncertain action as successful.
- Flag browser, microphone, audio, WebRTC, WebSocket, or Realtime tests that do
  not close sessions and stop media tracks in failure-safe teardown.
