import { CustomScalar, Scalar } from '@nestjs/graphql';
import { JsonObject, JsonValue, isJsonObject } from '@org/models';
import { Kind, ValueNode } from 'graphql';

// Accepts plain JSON objects for GraphQL params.
@Scalar('JSONObject', () => Object)
export class JsonObjectScalar implements CustomScalar<unknown, JsonObject> {
  description = 'JSON object scalar';

  // Serializes a JSON object back to the GraphQL response.
  serialize(value: unknown): JsonObject {
    const parsedValue = this.parseUnknownValue(value);
    if (!isJsonObject(parsedValue)) {
      throw new Error('JSONObject values must be plain objects.');
    }

    return parsedValue;
  }

  // Parses GraphQL variable values into a JSON object.
  parseValue(value: unknown): JsonObject {
    const parsedValue = this.parseUnknownValue(value);
    if (!isJsonObject(parsedValue)) {
      throw new Error('JSONObject input must be a plain object.');
    }

    return parsedValue;
  }

  // Parses inline GraphQL literals into a JSON object.
  parseLiteral(ast: ValueNode): JsonObject {
    const parsedValue = this.parseAst(ast);
    if (!isJsonObject(parsedValue)) {
      throw new Error('JSONObject input must be a plain object.');
    }

    return parsedValue;
  }

  // Keeps scalar parsing logic in one place for reuse.
  private parseUnknownValue(value: unknown): JsonValue {
    return value as JsonValue;
  }

  // Recursively converts GraphQL AST nodes into JSON values.
  private parseAst(ast: ValueNode): JsonValue {
    switch (ast.kind) {
      case Kind.NULL:
        return null;
      case Kind.STRING:
      case Kind.ENUM:
        return ast.value;
      case Kind.INT:
      case Kind.FLOAT:
        return Number(ast.value);
      case Kind.BOOLEAN:
        return ast.value;
      case Kind.LIST:
        return ast.values.map((valueNode) => this.parseAst(valueNode));
      case Kind.OBJECT:
        return ast.fields.reduce<JsonObject>((result, field) => {
          result[field.name.value] = this.parseAst(field.value);
          return result;
        }, {});
      default:
        throw new Error('Unsupported JSON literal kind "' + ast.kind + '".');
    }
  }
}
