const escape = (value: string) => value.replace(/[&<>]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[char]!));
export const emailTemplate = (message: string, title: string) => '<html><body><h1>' + escape(title) + '</h1><p>' + escape(message) + '</p><p>Verification codes expire in 10 minutes. Do not share your code.</p></body></html>';
