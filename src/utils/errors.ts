export class NebuboxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NebuboxError';
  }
}

export class DockerNotFoundError extends NebuboxError {
  constructor() {
    super('Docker is not installed or not running. Please install Docker and try again.');
    this.name = 'DockerNotFoundError';
  }
}

export class ImageBuildError extends NebuboxError {
  constructor(imageName: string, detail?: string) {
    super(`Failed to build image "${imageName}"${detail ? `: ${detail}` : ''}`);
    this.name = 'ImageBuildError';
  }
}

export class ContainerError extends NebuboxError {
  constructor(action: string, containerName: string, detail?: string) {
    super(`Failed to ${action} container "${containerName}"${detail ? `: ${detail}` : ''}`);
    this.name = 'ContainerError';
  }
}

export class ValidationError extends NebuboxError {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
