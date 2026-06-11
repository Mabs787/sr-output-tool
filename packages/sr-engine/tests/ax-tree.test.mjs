import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { axNodeToDescriptor } = require("../dist/index.js");

test("axNodeToDescriptor maps CDP accessibility properties", () => {
  assert.deepEqual(
    axNodeToDescriptor({
      nodeId: "7",
      role: { value: "checkbox" },
      name: { value: "Subscribe" },
      description: { value: "Newsletter setting" },
      properties: [
        { name: "checked", value: { value: "mixed" } },
        { name: "disabled", value: { value: true } },
        { name: "setsize", value: { value: 3 } },
        { name: "posinset", value: { value: 2 } },
        { name: "invalid", value: { value: "spelling" } },
        { name: "errormessage", value: { value: "Fix the value" } },
      ],
    }),
    {
      role: "checkbox",
      name: "Subscribe",
      description: "Newsletter setting",
      checked: "mixed",
      disabled: true,
      setSize: 3,
      positionInSet: 2,
      invalid: "spelling",
      errorMessage: "Fix the value",
    },
  );
});
