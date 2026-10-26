// Resolves relative imports without extensions when Node runs the Vite source tests.
export async function resolve(specifier, context, nextResolve) {
    if (specifier.startsWith(".") && !/\.[a-z\d]+$/i.test(specifier)) {
        for (const extension of [".js", ".jsx"]) {
            try {
                return await nextResolve(`${specifier}${extension}`, context);
            } catch (error) {
                if (error.code !== "ERR_MODULE_NOT_FOUND") throw error;
            }
        }
    }

    return nextResolve(specifier, context);
}
