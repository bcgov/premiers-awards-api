/*!
 * Schema services
 * File: schema.services.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

/**
 * Lookup tables for schema options
 *
 */

const schemaData = {
  maxDrafts: 60,
  maxAttachments: 5,
  year: 2023,
  status: [
    { value: "draft", text: "Draft" },
    { value: "submitted", text: "Submitted" },
  ],
  roles: [
    { value: "inactive", text: "Inactive" },
    { value: "nominator", text: "Nominator" },
    { value: "administrator", text: "Administrator" },
    { value: "super-administrator", text: "Super-Administrator" },
  ],
  categories: [
    {
      value: "emerging-leader",
      text: "Emerging Leader",
      sections: [
        "summary",
        "context",
        "valuing_people",
        "commitment",
        "impact",
      ],
    },
    {
      value: "evidence-based-design",
      text: "Evidence-Based Design",
      sections: ["summary", "context", "complexity", "approach", "impact"],
    },
    {
      value: "innovation",
      text: "Innovation",
      sections: ["summary", "context", "complexity", "approach", "impact"],
    },
    {
      value: "leadership",
      text: "Leadership",
      sections: [
        "summary",
        "context",
        "valuing_people",
        "complexity",
        "commitment",
        "impact",
      ],
    },
    {
      value: "legacy",
      text: "Legacy",
      sections: [
        "summary",
        "context",
        "complexity",
        "valuing_people",
        "contribution",
        "impact",
      ],
    },
    {
      value: "organizational-excellence",
      text: "Organizational Excellence",
      sections: ["summary", "context", "complexity", "approach", "impact"],
    },
    {
      value: "partnership",
      text: "Partnership",
      sections: ["summary", "context", "complexity", "approach", "impact"],
    },
    {
      value: "regional-impact",
      text: "Regional Impact",
      sections: ["summary", "context", "complexity", "approach", "impact"],
    },
  ],
  evaluationSections: [
    { value: "summary", text: "Summary" },
    { value: "context", text: "Context" },
    { value: "complexity", text: "Complexity" },
    { value: "approach", text: "Approach" },
    { value: "valuing_people", text: "Valuing People" },
    { value: "commitment", text: "Commitment to the Organization" },
    {
      value: "contribution",
      text: "Contribution to BC Public Service Excellence",
    },
    { value: "impact", text: "Impact" },
  ],
  organizations: [
    {
      key: "org-1",
      label: "Post-Secondary Education and Future Skills",
    },
    { key: "org-2", label: "Agriculture and Food" },
    { key: "org-3", label: "Attorney General" },
    { key: "org-4", label: "Children and Family Development" },
    { key: "org-5", label: "Citizens’ Services" },
    { key: "org-6", label: "Education and Child Care" },
    {
      key: "org-7",
      label: "Emergency Management and Climate Readiness",
    },
    {
      key: "org-8",
      label: "Energy, Mines and Low Carbon Innovation",
    },
    {
      key: "org-9",
      label: "Environment and Climate Change Strategy",
    },
    { key: "org-10", label: "Finance" },
    {
      key: "org-11",
      label: "Forests",
    },
    { key: "org-12", label: "Health" },
    {
      key: "org-13",
      label: "Indigenous Relations and Reconciliation",
    },
    {
      key: "org-14",
      label: "Jobs, Economic Development and Innovation",
    },
    { key: "org-15", label: "Labour" },
    { key: "org-16", label: "Mental Health and Addictions" },
    { key: "org-17", label: "Municipal Affairs" },

    { key: "org-18", label: "Public Safety and Solicitor General" },
    {
      key: "org-19",
      label: "Social Development & Poverty Reduction",
    },
    { key: "org-20", label: "Tourism, Arts, Culture and Sport" },
    { key: "org-21", label: "Transportation and Infrastructure" },
    { key: "org-22", label: "BC Public Service Agency" },
    { key: "org-23", label: "Government Communications and Public Engagement" },
    { key: "org-24", label: "Office of the Premier" },
    { key: "org-25", label: "Water, Land and Resource Stewardship" },
    { key: "org-26", label: "Housing" },
  ],
  nomineeTypes: [
    { value: "partner", text: "Partner" },
    { value: "nominee", text: "Nominee" },
  ],
  mimeTypes: [
    { value: "application/pdf", text: "PDF" },
    { value: "application/doc", text: "MS Word" },
  ],
};

/**
 * get enumerated data by key
 * **/

exports.get = (key) => {
  return schemaData[key] !== "undefined" ? schemaData[key] : null;
};

/**
 * get enumerated data by key
 * **/

exports.lookup = (key, value) => {
  if (schemaData[key] === "undefined") return null;
  const found = schemaData[key].filter((item) => item.value === value);
  return found.length > 0 ? found[0].text : null;
};

/**
 * check if category contains given section
 * **/

exports.checkSection = (section, category) => {
  return (
    schemaData["categories"].filter((cat) => {
      return cat.value === category && cat.sections.includes(section);
    }).length > 0
  );
};

/**
 * check if category exists
 * **/

exports.checkCategory = (category) => {
  return (
    schemaData["categories"].filter((cat) => {
      return cat.value === category;
    }).length > 0
  );
};
