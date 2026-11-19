// Typed errors of the sync cipher. A wrong passphrase and a changed file
// cannot be told apart: both fail the authentication tag.

/** The passphrase is wrong or the file was changed. */
export class WrongPassphrase extends Error {
  constructor() {
    super('The passphrase is wrong or the file was changed');
    this.name = 'WrongPassphrase';
  }
}

/** The envelope names a scheme or parameters this build does not use or allow. */
export class UnsupportedEnvelope extends Error {
  constructor(reason: string) {
    super(`Unsupported sync file: ${reason}`);
    this.name = 'UnsupportedEnvelope';
  }
}
