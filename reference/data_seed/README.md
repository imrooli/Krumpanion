# Static Data Seed Notes

Krumpanion should use local JSON seed data instead of live scraping.

Suggested seed files:

```txt
src/data/resinRules.json
src/data/materialSources.json
src/data/characters.json
src/data/characterAscensionCosts.json
src/data/talentCosts.json
src/data/weapons.json
src/data/weaponAscensionCosts.json
src/data/artifactDomains.json
```

Use Genshin Impact Wiki as the manual data source.

## Minimum starter source tables

### resinRules.json

Contains Original Resin cap, regeneration rate, and activity costs.

### materialSources.json

Maps material keys to activity sources and availability days.

Example shape:

```json
{
  "TeachingsOfFreedom": {
    "sourceType": "domain_of_mastery",
    "sourceKey": "ForsakenRift",
    "sourceName": "Forsaken Rift",
    "availability": "MON_THU_SUN",
    "resinCost": 20
  }
}
```

### artifactDomains.json

Maps artifact set keys to domains.

Example shape:

```json
{
  "GoldenTroupe": {
    "domainKey": "DenouementOfSin",
    "domainName": "Denouement of Sin",
    "availability": "ALWAYS",
    "resinCost": 20
  }
}
```

## Important

Keep raw GOOD keys internally. Add display name mappings separately.
