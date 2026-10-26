// Installs the resolver for relative imports used by Vite source modules in Node tests.
import { register } from "node:module";

register("./extensionless-loader.js", import.meta.url);
