/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
};

/** Author of a complete Track or a Module */
export type Author = {
  __typename: 'Author';
  id: Scalars['ID']['output'];
  /** Author's first and last name */
  name: Scalars['String']['output'];
  /** Author's profile picture */
  photo: Maybe<Scalars['String']['output']>;
};

export type IncrementTrackViewsResponse = {
  __typename: 'IncrementTrackViewsResponse';
  /** Similar to HTTP status code, represents the status of the mutation */
  code: Scalars['Int']['output'];
  /** Human-readable message for the UI */
  message: Scalars['String']['output'];
  /** Indicates whether the mutation was successful */
  success: Scalars['Boolean']['output'];
  /** Newly updated track after a successful mutation */
  track: Maybe<Track>;
};

/** A Module is a single unit of teaching. Multiple Modules compose a Track */
export type Module = {
  __typename: 'Module';
  /** The module's text-based description, can be in markdown format. In case of a video, it will be the enriched transcript */
  content: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** The module's length in minutes */
  length: Maybe<Scalars['Int']['output']>;
  /** The module's title */
  title: Scalars['String']['output'];
  /** The module's video url, for video-based modules */
  videoUrl: Maybe<Scalars['String']['output']>;
};

export type Mutation = {
  __typename: 'Mutation';
  /** Increment the number of views of a given track, when the track card is clicked */
  incrementTrackViews: IncrementTrackViewsResponse;
};


export type MutationIncrementTrackViewsArgs = {
  id: Scalars['ID']['input'];
};

export type Query = {
  __typename: 'Query';
  /** Fetch a specific module, provided a module's ID */
  module: Module;
  /** Fetch a specific track, provided a track's ID */
  track: Track;
  /** Query to get tracks array for the homepage grid */
  tracksForHome: Array<Track>;
};


export type QueryModuleArgs = {
  id: Scalars['ID']['input'];
};


export type QueryTrackArgs = {
  id: Scalars['ID']['input'];
};

/** A track is a group of Modules that teaches about a specific topic */
export type Track = {
  __typename: 'Track';
  /** The track's main Author */
  author: Author;
  /** The track's complete description, can be in markdown format */
  description: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isFavorite: Scalars['Boolean']['output'];
  /** The track's approximate length to complete, in minutes */
  length: Maybe<Scalars['Int']['output']>;
  /** The track's complete array of Modules */
  modules: Array<Module>;
  /** The number of modules this track contains */
  modulesCount: Maybe<Scalars['Int']['output']>;
  /** The number of times a track has been viewed */
  numberOfViews: Maybe<Scalars['Int']['output']>;
  /** The track's illustration to display in track card or track page detail */
  thumbnail: Maybe<Scalars['String']['output']>;
  /** The track's title */
  title: Scalars['String']['output'];
};

export type FavoriteStatus_TrackFragment = { __typename: 'Track', id: string, isFavorite: boolean };

export type RegisterViewClientForm_TrackFragment = { __typename: 'Track', id: string, numberOfViews: number | null };

export type TrackCard_TrackFragment = { __typename: 'Track', id: string, title: string, thumbnail: string | null, length: number | null, modulesCount: number | null, author: { __typename: 'Author', id: string, name: string, photo: string | null } };

export type TrackDetail_TrackFragment = { __typename: 'Track', id: string, title: string, description: string | null, thumbnail: string | null, length: number | null, modulesCount: number | null, numberOfViews: number | null, author: { __typename: 'Author', id: string, name: string, photo: string | null }, modules: Array<{ __typename: 'Module', id: string, title: string, length: number | null }> };

export type GetTracksQueryVariables = Exact<{ [key: string]: never; }>;


export type GetTracksQuery = { tracksForHome: Array<{ __typename: 'Track', id: string, title: string, thumbnail: string | null, length: number | null, modulesCount: number | null, author: { __typename: 'Author', id: string, name: string, photo: string | null } }> };

export type GetTrackQueryVariables = Exact<{
  trackId: string | number;
}>;


export type GetTrackQuery = { track: { __typename: 'Track', id: string, title: string, description: string | null, thumbnail: string | null, length: number | null, modulesCount: number | null, numberOfViews: number | null, author: { __typename: 'Author', id: string, name: string, photo: string | null }, modules: Array<{ __typename: 'Module', id: string, title: string, length: number | null }> } };

export type IncrementTrackViewsMutationVariables = Exact<{
  trackId: string | number;
}>;


export type IncrementTrackViewsMutation = { incrementTrackViews: { __typename: 'IncrementTrackViewsResponse', code: number, success: boolean, message: string, track: { __typename: 'Track', id: string, numberOfViews: number | null } | null } };

export const FavoriteStatus_TrackFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"FavoriteStatus_track"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Track"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"isFavorite"},"directives":[{"kind":"Directive","name":{"kind":"Name","value":"client"}}]}]}}]} as unknown as DocumentNode<FavoriteStatus_TrackFragment, unknown>;
export const RegisterViewClientForm_TrackFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RegisterViewClientForm_track"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Track"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"numberOfViews"}}]}}]} as unknown as DocumentNode<RegisterViewClientForm_TrackFragment, unknown>;
export const TrackCard_TrackFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TrackCard_track"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Track"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"thumbnail"}},{"kind":"Field","name":{"kind":"Name","value":"length"}},{"kind":"Field","name":{"kind":"Name","value":"modulesCount"}},{"kind":"Field","name":{"kind":"Name","value":"author"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"photo"}}]}}]}}]} as unknown as DocumentNode<TrackCard_TrackFragment, unknown>;
export const TrackDetail_TrackFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TrackDetail_track"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Track"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"thumbnail"}},{"kind":"Field","name":{"kind":"Name","value":"length"}},{"kind":"Field","name":{"kind":"Name","value":"modulesCount"}},{"kind":"Field","name":{"kind":"Name","value":"numberOfViews"}},{"kind":"Field","name":{"kind":"Name","value":"author"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"photo"}}]}},{"kind":"Field","name":{"kind":"Name","value":"modules"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"length"}}]}}]}}]} as unknown as DocumentNode<TrackDetail_TrackFragment, unknown>;
export const GetTracksDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetTracks"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tracksForHome"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"TrackCard_track"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TrackCard_track"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Track"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"thumbnail"}},{"kind":"Field","name":{"kind":"Name","value":"length"}},{"kind":"Field","name":{"kind":"Name","value":"modulesCount"}},{"kind":"Field","name":{"kind":"Name","value":"author"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"photo"}}]}}]}}]} as unknown as DocumentNode<GetTracksQuery, GetTracksQueryVariables>;
export const GetTrackDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetTrack"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"trackId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"track"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"trackId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"TrackDetail_track"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TrackDetail_track"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Track"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"thumbnail"}},{"kind":"Field","name":{"kind":"Name","value":"length"}},{"kind":"Field","name":{"kind":"Name","value":"modulesCount"}},{"kind":"Field","name":{"kind":"Name","value":"numberOfViews"}},{"kind":"Field","name":{"kind":"Name","value":"author"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"photo"}}]}},{"kind":"Field","name":{"kind":"Name","value":"modules"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"length"}}]}}]}}]} as unknown as DocumentNode<GetTrackQuery, GetTrackQueryVariables>;
export const IncrementTrackViewsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"IncrementTrackViews"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"trackId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"incrementTrackViews"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"trackId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"track"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"numberOfViews"}}]}}]}}]}}]} as unknown as DocumentNode<IncrementTrackViewsMutation, IncrementTrackViewsMutationVariables>;