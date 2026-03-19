import Moralis from "moralis";

export async function deleteStream(streamId) {
  await Moralis.Streams.delete({
    id: streamId,
  });

  console.log("✅ Stream deleted:", streamId);
}