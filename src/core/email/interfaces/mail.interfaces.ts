export interface MailData {
    readonly from:string
    readonly to:string|string[]
    readonly subject:string
    readonly ['o:campaign']?:string
    'recipient-variables'?:object|string
    readonly template?:string
    readonly html?:string
    readonly 'h:X-Mailgun-Variables'?:object|string
    attachment?: any
}
