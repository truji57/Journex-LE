# AGENTS.md

## Reglas importantes

- **Solo ejecutar `/commit` cuando el usuario lo pida explícitamente.** No hacer commit, tag ni push de forma automática tras completar cambios de código.
- Cuando se pida hacer commit, usar el comando `/commit` definido en `opencode.json`: sube la versión (MINOR), actualiza `server/changelog.json`, commitea, crea tag y hace push a `master`.
