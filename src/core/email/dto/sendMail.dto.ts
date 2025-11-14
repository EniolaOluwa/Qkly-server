export class SendMailDto {
    to:string;
    from:string;
    subject:string;
    data?:any
}

export class MailDispatcherDto {
    readonly from:string
     to:string | string[]
    readonly subject:string
    readonly template?:string
    readonly variables?:object
    readonly html?:string
    readonly contactData?:{email:string, firstname:string,link:string}[]
    attachment?:any
}