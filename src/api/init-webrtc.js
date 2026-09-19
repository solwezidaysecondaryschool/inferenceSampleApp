export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ROBOFLOW_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "ROBOFLOW_API_KEY is not configured in Vercel"
    });
  }

  try {
    const { offer, wrtcparams } = req.body || {};

    if (!offer || !wrtcparams) {
      return res.status(400).json({
        error: "Missing WebRTC offer or Workflow parameters"
      });
    }

    const roboflowResponse = await fetch(
      "https://serverless.roboflow.com/initialise_webrtc_worker",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          api_key: apiKey,
          webrtc_offer: offer,
          workflow_configuration: {
            workspace_name: wrtcparams.workspaceName,
            workflow_id: wrtcparams.workflowId,
            image_input_name: wrtcparams.imageInputName || "image",
            disable_sinks: false
          },
          stream_output: wrtcparams.streamOutputNames || ["output_image"],
          data_output: wrtcparams.dataOutputNames || ["predictions"],
          processing_timeout: wrtcparams.processingTimeout || 3600,
          requested_plan:
            wrtcparams.requestedPlan || "webrtc-gpu-medium",
          requested_region: wrtcparams.requestedRegion || "us",
          webrtc_realtime_processing: true,
          is_preview: false
        })
      }
    );

    const responseText = await roboflowResponse.text();

    let responseBody;
    try {
      responseBody = JSON.parse(responseText);
    } catch {
      responseBody = { error: responseText };
    }

    if (!roboflowResponse.ok) {
      console.error("Roboflow error:", responseBody);

      return res.status(roboflowResponse.status).json({
        error:
          responseBody?.detail ||
          responseBody?.error ||
          "Roboflow WebRTC initialization failed"
      });
    }

    return res.status(200).json(responseBody);
  } catch (error) {
    console.error("WebRTC proxy error:", error);

    return res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "WebRTC initialization failed"
    });
  }
}
