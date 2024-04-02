import { SNSClient, PublishCommand } from '@aws-sdk/client-sns'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'

const bucketName = process.env.BUCKET_NAME
const s3Client = new S3Client({ region: 'ap-northeast-1' })

const topicArn = process.env.TOPIC_ARN
const snsClient = new SNSClient({ region: 'ap-northeast-1' })
export const handler = async (event) => {
    console.log(JSON.stringify(event))
    const { s3: { object: { key } }} = event.Records[0]

    if (!key) { return }

    const getCommand = new GetObjectCommand({
        Bucket: bucketName,
        Key: key
    })
    try {
        const s3Response = await s3Client.send(getCommand)
        const textData = await s3Response.Body?.transformToString()

        const publishCommand = new PublishCommand({
            TopicArn: topicArn,
            Subject: '渋滞情報',
            Message: `${textData}\n\nhttps://www.youtube.com/watch?v=slOgQojt8w8\n\nhttps://www.c-ihighway.jp/pcsite/map?area=area04`,
        });
        const result = await snsClient.send(publishCommand);
        return result
    } catch (error) {
        console.error(error)
        throw error
    }
}
