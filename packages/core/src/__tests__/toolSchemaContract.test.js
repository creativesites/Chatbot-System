/**
 * Guards the Gemini tool-calling contract.
 *
 * Gemini serialises a tool result into FunctionResponse.response, which is a
 * protobuf Struct - i.e. a JSON *object*. A tool whose outputSchema is a bare
 * array makes the whole turn fail with:
 *
 *   Invalid JSON payload received. Unknown name "response" at
 *   'contents[N].parts[0].function_response': Proto field is not repeating,
 *   cannot start list.
 *
 * The model then falls through every fallback model and answers without the
 * tool, so the failure looks like "the feature just doesn't work" rather than
 * an error. Four tools shipped this way (searchServices, lookupFAQ,
 * findStylistOrSalon, searchHairMedia) - which is why visual media and stylist
 * lookup never produced cards despite their unit tests passing.
 *
 * The existing handler tests cannot catch this: they call the handler directly
 * and never exercise the schema. This does.
 */

jest.mock('../database', () => ({
    pgClient: { query: jest.fn().mockResolvedValue({ rows: [] }) },
    redisClient: { get: jest.fn(), set: jest.fn() },
}));

const captured = {};
jest.mock('../ai', () => ({
    defineTool: (def, handler) => {
        captured[def.name] = def;
        return { name: def.name, __def: def, __handler: handler };
    },
    dynamicTool: (def, handler) => {
        captured[def.name] = def;
        return { name: def.name, __def: def, __handler: handler };
    },
    generate: jest.fn(),
}));

const { globalTools, createUserTools } = require('../agentTools');

/**
 * Zod schemas expose their kind via _def.typeName. An object-like root
 * (ZodObject / ZodRecord) serialises to a Struct; ZodArray does not.
 */
function rootTypeName(schema) {
    return schema && schema._def && schema._def.typeName;
}

describe('tool outputSchema is Struct-compatible', () => {
    const allTools = [...globalTools, ...createUserTools('test-user')];

    test('every registered tool was captured with a definition', () => {
        expect(allTools.length).toBeGreaterThan(0);
        allTools.forEach((tool) => {
            expect(captured[tool.name]).toBeDefined();
        });
    });

    test.each(
        [...globalTools, ...createUserTools('test-user')].map((t) => [t.name])
    )('%s does not declare a top-level array outputSchema', (name) => {
        const def = captured[name];
        const typeName = rootTypeName(def.outputSchema);

        if (typeName === 'ZodArray') {
            throw new Error(
                `Tool "${name}" declares a top-level array outputSchema. Gemini's ` +
                'FunctionResponse.response is a protobuf Struct and cannot be a list, so ' +
                'every call to this tool fails the turn with "Proto field is not repeating, ' +
                'cannot start list". Wrap the array in an object, e.g. ' +
                'z.object({ results: z.array(...) }), and return { results: [...] }.'
            );
        }

        expect(['ZodObject', 'ZodRecord']).toContain(typeName);
    });
});
