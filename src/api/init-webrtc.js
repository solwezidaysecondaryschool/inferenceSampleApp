export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  const apiKey = process.env.ROBOFLOW_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "ROBOFLOW_API_KEY is not configured in Vercel"
    });
  }

  try {
    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body || {};

    let payload;

    // Accept a request already formatted for Roboflow.
    if (body.webrtc_offer && body.workflow_configuration) {
      payload = {
        ...body,
        api_key: apiKey,
        is_preview: false,
        workflow_configuration: {
          ...body.workflow_configuration,
          disable_sinks: false
        }
      };
    } else {
      // Accept the format sent by the browser proxy connector.
      const offer =
        body.offer ||
        body.webrtcOffer ||
        body.webrtc_offer;

      const params =
        body.wrtcparams ||
        body.wrtcParams ||
        body.params;

      if (!offer || !params) {
        return res.status(400).json({
          error: "Unsupported proxy request format",
          received_fields: Object.keys(body)
        });
      }

      payload = {
        api_key: apiKey,
        is_preview: false,
        webrtc_offer: offer,

        workflow_configuration: {
          type: "WorkflowConfiguration",
          workspace_name:
            params.workspaceName || "days-workspace-pmifl",
          workflow_id:
            params.workflowId || "no-phone-zone-v9-logic",
          image_input_name:
            params.imageInputName || "image",
          workflows_parameters:
            params.workflowParameters || {},
          workflows_thread_pool_workers: 4,
          cancel_thread_pool_tasks_on_exit: true,
          video_metadata_input_name: "video_metadata",
          disable_sinks: false
        },

        stream_output:
          params.streamOutputNames || ["output_image"],

        data_output:
          params.dataOutputNames || [
            "predictions",
            "phone_count",
            "make_webhook_error",
            "make_webhook_throttled",
            "make_webhook_message"
          ],

        processing_timeout:
          params.processingTimeout || 3600,

        requested_plan:
          params.requestedPlan || "webrtc-gpu-medium",

        requested_region:
          params.requestedRegion || "us",

        webrtc_realtime_processing: true
      };
    }

    const response = await fetch(
      "https://serverless.roboflow.com/initialise_webrtc_worker",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }
    );

    const responseText = await response.text();

    let responseData;

    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = {
        error: responseText
      };
    }

    if (!response.ok) {
      console.error("Roboflow response:", responseData);
      return res.status(response.status).json(responseData);
    }

    return res.status(200).json(responseData);
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
