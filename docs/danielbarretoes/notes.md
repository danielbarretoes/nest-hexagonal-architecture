# Notes

- I do not think the `shared` folder inside `iam` is strictly necessary. Files may be reused, but the internal data model is not really shared.

- Hardcoded roles are not enough for me. I prefer a `roles` entity so permissions can be assigned per module instead of staying fully generic, with a small baseline seed.

## Ideas

- Audit logging system
- OpenTelemetry support for ELK or Grafana
