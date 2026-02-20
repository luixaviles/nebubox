import { describe, it, expect } from 'vitest';
import {
  NebuboxError,
  DockerNotFoundError,
  ImageBuildError,
  ContainerError,
  ValidationError,
} from './errors.js';

describe('NebuboxError', () => {
  it('is an instance of Error', () => {
    const err = new NebuboxError('test');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(NebuboxError);
  });

  it('has correct name and message', () => {
    const err = new NebuboxError('something broke');
    expect(err.name).toBe('NebuboxError');
    expect(err.message).toBe('something broke');
  });
});

describe('DockerNotFoundError', () => {
  it('extends NebuboxError', () => {
    const err = new DockerNotFoundError();
    expect(err).toBeInstanceOf(NebuboxError);
    expect(err).toBeInstanceOf(Error);
  });

  it('has a preset message', () => {
    const err = new DockerNotFoundError();
    expect(err.name).toBe('DockerNotFoundError');
    expect(err.message).toMatch(/Docker is not installed/);
  });
});

describe('ImageBuildError', () => {
  it('extends NebuboxError', () => {
    const err = new ImageBuildError('myimage');
    expect(err).toBeInstanceOf(NebuboxError);
  });

  it('includes image name in message', () => {
    const err = new ImageBuildError('nebubox-claude:latest');
    expect(err.message).toContain('nebubox-claude:latest');
  });

  it('includes optional detail', () => {
    const err = new ImageBuildError('img', 'network timeout');
    expect(err.message).toContain('network timeout');
  });

  it('works without detail', () => {
    const err = new ImageBuildError('img');
    expect(err.message).not.toContain('undefined');
  });
});

describe('ContainerError', () => {
  it('extends NebuboxError', () => {
    const err = new ContainerError('create', 'mycontainer');
    expect(err).toBeInstanceOf(NebuboxError);
  });

  it('includes action and container name', () => {
    const err = new ContainerError('start', 'nebubox-claude-proj');
    expect(err.message).toContain('start');
    expect(err.message).toContain('nebubox-claude-proj');
  });

  it('includes optional detail', () => {
    const err = new ContainerError('stop', 'c1', 'already stopped');
    expect(err.message).toContain('already stopped');
  });
});

describe('ValidationError', () => {
  it('extends NebuboxError', () => {
    const err = new ValidationError('bad input');
    expect(err).toBeInstanceOf(NebuboxError);
  });

  it('has correct name and message', () => {
    const err = new ValidationError('invalid path');
    expect(err.name).toBe('ValidationError');
    expect(err.message).toBe('invalid path');
  });
});
