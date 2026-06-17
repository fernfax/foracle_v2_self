export const RELATIONSHIPS = [
  { value: "Self", label: "Self" },
  { value: "Child", label: "Child" },
  { value: "Parent", label: "Parent" },
  { value: "Sibling", label: "Sibling" },
  { value: "Spouse", label: "Spouse" },
  { value: "Others", label: "Others" }
] as const

export type RelationshipValue = (typeof RELATIONSHIPS)[number]["value"]

export const RELATIONSHIP_VALUES = RELATIONSHIPS.map(
  (r) => r.value
) as readonly RelationshipValue[]
