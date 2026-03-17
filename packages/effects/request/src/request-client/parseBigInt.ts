/**
 * BigInt类型数据转换
 */
import JSONbig from 'json-bigint';

const JSONbigNative = JSONbig({ useNativeBigInt: true }); // 先用原生 BigInt 保留精度

// 需要转为 string 的字段名
const BIG_INT_KEYS = new Set(['id', 'orderId', 'parentId', 'userId']);

function convertKeys(data: unknown): unknown {
  if (Array.isArray(data)) {
    return data.map(convertKeys);
  }
  if (data !== null && typeof data === 'object') {
    return Object.fromEntries(
      Object.entries(data).map(([k, v]) => {
        // 命中指定字段且是 BigInt，转为 string
        if (BIG_INT_KEYS.has(k) && typeof v === 'bigint') {
          return [k, v.toString()];
        }
        // 否则递归处理
        return [k, convertKeys(v)];
      }),
    );
  }
  return data;
}

export function parseResponse(raw: string): unknown {
  try {
    const parsed = JSONbigNative.parse(raw);
    return convertKeys(parsed);
  } catch {
    return raw;
  }
}
