import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as events from 'aws-cdk-lib/aws-events'
import * as targets from 'aws-cdk-lib/aws-events-targets'
import { S3EventSource } from 'aws-cdk-lib/aws-lambda-event-sources'
import * as sns from 'aws-cdk-lib/aws-sns'
import * as subs from 'aws-cdk-lib/aws-sns-subscriptions'
import * as config from 'config'
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class AppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ./config以下のJSONファイルから設定値を読み取る
    const mailAddress = config.get<string>('mailAddress')
    const prefix = config.get<string>('prefix')
    
    // iHighwayのjsonエンドポイントのレスポンス格納用S3
    const bucket = new s3.Bucket(this, 'api-result-bucket', {
      bucketName: `${prefix}-api-result-bucket`
    })

    // iHighwayにスクレイピングを行うLambda
    const fetchLambda = new lambda.Function(this, 'fetchLambda', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('./lambda/fetchLambda'),
      environment: {
        BUCKET_NAME: bucket.bucketName
      }
    })

    // Lambdaを30分おきに実行
    const event = new events.Rule(this, 'fetch-rule', {
      schedule: events.Schedule.rate(cdk.Duration.minutes(30)),
      targets: [
        new targets.LambdaFunction(fetchLambda)
      ]
    })

    bucket.grantPut(fetchLambda)

    // S3をトリガーに、メール送信用Lambdaを起動する
    const topic = new sns.Topic(this, 'mail-topic', {
      topicName: 'mail-topic',
    })

    topic.addSubscription(new subs.EmailSubscription(mailAddress))

    // メール送信用Lambda
    const sendMailLambda = new lambda.Function(this, 'sendMailLambda', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('./lambda/sendMailLambda'),
      environment: {
        BUCKET_NAME: bucket.bucketName,
        TOPIC_ARN: topic.topicArn
      }
    })
    topic.grantPublish(sendMailLambda)
    bucket.grantRead(sendMailLambda)

    sendMailLambda.addEventSource(new S3EventSource(bucket, {
      events: [
        s3.EventType.OBJECT_CREATED_PUT
      ]
    }))
  }
}
