import { InferenceHTTPClient } from "@roboflow/inference-sdk/api";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.ROBOFLOW_API_KEY) {
    return res.status(500).json({
      error: "ROBOFLOW_API_KEY is not configured"
    });
  }

  try {
    const { offer, wrtcparams } = req.body;

    if (!offer || !wrtcparams) {
      return res.status(400).json({
        error: "Missing WebRTC offer or Workflow parameters"
      });
    }

    const client = InferenceHTTPClient.init({
      apiKey: process.env.ROBOFLOW_API_KEY
    });

    const answer = await client.initializeWebrtcWorker({
      offer,
      workspaceName: wrtcparams.workspaceName,
      workflowId: wrtcparams.workflowId,
      config: {
        imageInputName: wrtcparams.imageInputName,
        streamOutputNames: wrtcparams.streamOutputNames,
        dataOutputNames: wrtcparams.dataOutputNames
      }
    });

    return res.status(200).json(answer);
  } catch (error) {
    console.error("WebRTC initialization failed:", error);

    return res.status(500).json({
      error: error instanceof Error ? error.message : "WebRTC initialization failed"
    });
  }
}
