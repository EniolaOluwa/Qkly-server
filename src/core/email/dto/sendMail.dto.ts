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
    readonly html:string
  
}