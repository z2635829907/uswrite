/** 携带 HTTP 状态码的业务错误,前后端 API 层共用。 */
export class ResponseError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}
