import {
  bundlrStorage,
  keypairIdentity,
  Metaplex,
  CreatorInput,
  KeypairSigner,
  JsonMetadata,
  CreateSftInput,
  Sft,
  SftWithToken
} from '@metaplex-foundation/js'
import { Keypair, Connection, PublicKey } from '@solana/web3.js'
import { getEnvVariable, getStorageConfig } from './config'
import logger from './logger'

// const UNLIMINTED_SUPPLY = null;
interface MccConfig {
  name: string
  imgUrl: string
  sellerFeeBasisPoints: number
  creators: Array<{
    address: PublicKey
    share: number
  }>
}

/**
 * @return MCC nft object
 */
export async function mintMcc(connection: Connection, mccConfig: MccConfig) {
  // assert(mccConfig.creators.length > 0, ERROR.METADATA_NO_CREATORS)

  // Generic secret key is used as a simple solution
  // we should use creators sign to proceed with creation of token accounts
  const demoSecretKey = getEnvVariable('DEMO_SECRET_KEY')
  const creatorKeypair = Keypair.fromSecretKey(Buffer.from(JSON.parse(demoSecretKey)))

  const royaltySecretKey = getEnvVariable('PROJECT_ROYALTY_SECRET_KEY')
  const projectRoyaltyKeypair = Keypair.fromSecretKey(Buffer.from(JSON.parse(royaltySecretKey)))

  const metaplex = Metaplex.make(connection)
    .use(keypairIdentity(creatorKeypair)) // FIXME how to use user wallet to sign this? e.g. WalletAdapterIdentityDriver
    .use(bundlrStorage(getStorageConfig()))
  logger.debug('Public key of keypair being used: ', creatorKeypair.publicKey.toBase58())

  // NOTE: we do not follow a convention here that the first creator is a CM address
  const creators: CreatorInput[] = [
    ...mccConfig.creators,
    {
      // project wallet to collect our share of royalties
      address: projectRoyaltyKeypair.publicKey,
      share: 10
    }
  ]

  // NFT Metadata
  const offChainMetadata: JsonMetadata = {
    name: mccConfig.name,
    seller_fee_basis_points: mccConfig.sellerFeeBasisPoints,
    image: mccConfig.imgUrl,
    properties: {
      creators: creators.map((creator) => ({
        address: creator.address.toBase58(),
        share: creator.share
      }))
    },
    // Deprecated, but added since wallets and apps still using it
    collection: {
      name: mccConfig.name
    }
  }
  const uploadMetadataOutput = await metaplex.nfts().uploadMetadata(offChainMetadata)
  if (!uploadMetadataOutput?.uri) {
    throw new Error('error on upload metadata')
  }
  logger.debug('uploaded metadata uri:', uploadMetadataOutput.uri)

  const createNftOutput = await metaplex.nfts().create({
    uri: uploadMetadataOutput.uri,
    name: mccConfig.name,
    sellerFeeBasisPoints: 100_00,
    primarySaleHappened: true
  })

  return createNftOutput.nft
}

interface SftConfig {
  mccAddress: PublicKey
  collection: {
    name: string
    symbol?: string
    description?: string
    family?: string
  }
  sellerFeeBasisPoints: number
  imgUrl: string
  projectExternalUrl: string
  attributes?: Array<{
    // eslint-disable-next-line
    trait_type?: string
    value?: string
  }>
  creators: Array<{
    address: PublicKey
    share: number
  }>
  offchainPropertiesFiles?: Array<{
    type: 'image/jpg'
    uri: string
  }>
}

export async function createSft(
  connection: Connection,
  sftConfig: SftConfig
): Promise<[Sft | SftWithToken, JsonMetadata]> {
  // assert(sftConfig.creators.length > 0, ERROR.METADATA_NO_CREATORS)

  // Generic secret key is used as a simple solution
  // we should use creators sign to proceed with creation of token accounts
  const demoSecretKey = getEnvVariable('DEMO_SECRET_KEY')
  const creatorKeypair = Keypair.fromSecretKey(Buffer.from(JSON.parse(demoSecretKey)))

  const royaltySecretKey = getEnvVariable('PROJECT_ROYALTY_SECRET_KEY')
  const projectRoyaltyKeypair = Keypair.fromSecretKey(Buffer.from(JSON.parse(royaltySecretKey)))

  const metaplex = Metaplex.make(connection)
    .use(keypairIdentity(creatorKeypair)) // FIXME how to use user wallet to sign this? e.g. WalletAdapterIdentityDriver
    .use(bundlrStorage(getStorageConfig()))
  logger.debug('Public key of keypair being used: ', creatorKeypair.publicKey.toBase58())

  // Create collection signer object
  const collectionSigner: KeypairSigner = {
    publicKey: creatorKeypair.publicKey,
    secretKey: creatorKeypair.secretKey
  }

  // NOTE: we do not follow a convention here that the first creator is a CM address
  const creators: CreatorInput[] = [
    ...sftConfig.creators,
    {
      // project wallet to collect our share of royalties
      address: projectRoyaltyKeypair.publicKey,
      share: 10
    }
  ]

  // NFT Metadata
  const offChainMetadata: JsonMetadata = {
    name: sftConfig.collection.name,
    symbol: sftConfig.collection.symbol,
    description: sftConfig.collection.description,
    seller_fee_basis_points: sftConfig.sellerFeeBasisPoints,
    image: sftConfig.imgUrl,
    external_url: sftConfig.projectExternalUrl,
    attributes: sftConfig.attributes,
    properties: {
      creators: creators.map((creator) => ({
        address: creator.address.toBase58(),
        share: creator.share
      })),
      files: sftConfig.offchainPropertiesFiles,
      category: 'image'
    },
    // Deprecated, but added since wallets and apps still using it
    collection: {
      name: sftConfig.collection.name,
      family: sftConfig.collection.family
    }
  }
  const obj = await metaplex.nfts().uploadMetadata(offChainMetadata)
  const uri = obj.uri
  logger.debug('URI of SFT metadata', uri)

  // Create CreateSftInput object
  const createSftInput: CreateSftInput = {
    name: sftConfig.collection.name,
    symbol: sftConfig.collection.symbol,
    uri,
    // do we need it? it is optional
    // tokenOwner: metaplex.identity().publicKey,
    sellerFeeBasisPoints: sftConfig.sellerFeeBasisPoints,
    creators,
    // maxSupply: UNLIMINTED_SUPPLY,
    // MCC props
    isCollection: true,
    collection: sftConfig.mccAddress,
    collectionAuthority: collectionSigner, // FIXME owner of the collection should sign it
    collectionIsSized: false
  }

  const output = await metaplex.nfts().createSft(createSftInput)
  logger.debug('create sft output:', output)

  return [output.sft, offChainMetadata]
}
