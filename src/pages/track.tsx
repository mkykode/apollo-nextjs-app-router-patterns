import React from "react";
import { gql } from "../__generated__";
import { useQuery } from "@apollo/client";
import { useParams } from "react-router-dom";
import { Layout, QueryResult } from "../components";
import TrackDetail from "../components/track-detail";
export const GET_TRACK = gql(`
query GetTrack($trackId: ID!) {
  track(id: $trackId) {
    id
    title
    author {
      id
      name
      photo
    }
    thumbnail
    length
    modulesCount
    description
    numberOfViews
    modules {
      id
      title
      length
      content
      videoUrl
    }
  }
}
`);
const Track = () => {
  const { trackId = '' } = useParams()
  const { loading, error, data } = useQuery(GET_TRACK, {
    variables: {
      trackId
    }
  });
  return <Layout>
    <QueryResult data={data} loading={loading} error={error}>
      <TrackDetail
        track={data?.track}
      />
    </QueryResult>
  </Layout>;
};

export default Track;
