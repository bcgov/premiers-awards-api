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
    { value: "org-1", text: "BC Public Service Agency" },
    { value: "org-2", text: "Environmental Assessment Office" },
    {
      value: "org-3",
      text: "Government Communications and Public Engagement",
    },
    {
      value: "org-4",
      text: "Ministry of Post-Secondary Education and Future Skills",
    },
    { value: "org-5", text: "Ministry of Agriculture and Food" },
    {
      value: "org-6",
      text: "Ministry of Attorney General",
    },
    { value: "org-7", text: "Ministry of Children and Family Development" },
    { value: "org-8", text: "Ministry of Citizens’ Services" },
    { value: "org-9", text: "Ministry of Education and Child Care" },
    {
      value: "org-10",
      text: "Ministry of Energy, Mines and Low Carbon Innovation",
    },
    {
      value: "org-11",
      text: "Ministry of Environment and Climate Change Strategy",
    },
    { value: "org-12", text: "Ministry of Finance" },
    {
      value: "org-13",
      text: "Ministry of Forests",
    },
    { value: "org-14", text: "Ministry of Health" },
    {
      value: "org-15",
      text: "Ministry of Indigenous Relations and Reconciliation",
    },
    {
      value: "org-16",
      text: "Ministry of Ministry of Jobs, Economic Development and Innovation",
    },
    { value: "org-17", text: "Ministry of Labour" },
    {
      value: "org-18",
      text: "Land, Water and Resource Stewardship",
    },
    { value: "org-19", text: "Ministry of Mental Health and Addictions" },
    { value: "org-20", text: "Ministry of Municipal Affairs" },
    {
      value: "org-21",
      text: "Ministry of Public Safety and Solicitor General",
    },
    {
      value: "org-22",
      text: "Ministry of Social Development & Poverty Reduction",
    },
    { value: "org-23", text: "Ministry of Tourism, Arts, Culture and Sport" },
    { value: "org-24", text: "Ministry of Transportation & Infrastructure" },
    { value: "org-25", text: "Office of the Premier" },
    {
      value: "org-26",
      text: "Ministry of Emergency Management and Climate Readiness",
    },
    {
      value: "org-27",
      text: "Ministry of Housing",
    },
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
