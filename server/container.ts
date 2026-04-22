import { DataRepository } from './services/data-repository';
import { HybridRecommender } from './services/hybrid-recommender';
import { NeuralRecommender } from './services/neural-recommender';
import { SemanticRetriever } from './services/semantic-retriever';

export interface ServiceContainer {
  dataRepository: DataRepository;
  semanticRetriever: SemanticRetriever;
  neuralRecommender: NeuralRecommender;
  hybridRecommender: HybridRecommender;
  datasetDirectory: string;
  vectorStoreKind: string;
}
