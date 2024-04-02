import axios from 'axios'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const bucketName = process.env.BUCKET_NAME;
const s3 = new S3Client({
	region: "ap-northeast-1",
});

export const handler = async () => {
	
	const result = await axios.get('https://www.c-ihighway.jp/datas/json/traffic.json')

	const kantoArea = result.data.area04
	if (!kantoArea || !kantoArea.trafficInfo.jam) {
		return
	}
	const chuoJam = kantoArea.trafficInfo.jam.filter(j => j.roadName === '中央道')
	
	if (chuoJam.length === 0) {
		return
	}
	const message = chuoJam.map(jam => {
		const infoList = jam.info
		const infoMessage = infoList.map(info => {
			const { direction, distance, title } = info
			return `${title} ${direction}: ${distance}km渋滞中`
		})
		return infoMessage.join('\n')
	})
	.join('\n')
	
	const command = new PutObjectCommand({
		Bucket: bucketName,
		Key: `${Date.now()}.txt`,
		Body: message,
	  });
	  
	  // コマンドの実行
	  try {
		await s3.send(command);
		console.log("テキストデータをS3に保存しました。");
	  } catch (error) {
		console.error("エラーが発生しました:", error);
	  }
}
