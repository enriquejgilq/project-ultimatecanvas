export class DomainError extends Error {
  constructor(
    message: string,
    public readonly httpStatus: number = 422,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class UserNotFoundError extends DomainError {
  constructor(id: string) {
    super(`User ${id} not found`, 404);
  }
}

export class UserAlreadyExistsError extends DomainError {
  constructor(email: string) {
    super(`A user with email "${email}" already exists`, 409);
  }
}
